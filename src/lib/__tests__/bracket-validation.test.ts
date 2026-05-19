import { describe, it, expect } from 'vitest'
import { WC2026_GROUPS } from '../wc2026-groups'

// GROUP_TEAMS map logic mirrored from src/app/world-cup/bracket/actions.ts
const GROUP_TEAMS = new Map(WC2026_GROUPS.map(g => [g.letter, new Set(g.teams)]))

// Filter logic mirrored from saveBracketPicks
function filterValidRows(
  rows: { group_letter: string; first_place: string; second_place: string }[]
) {
  return rows.filter(r => {
    if (!r.first_place || !r.second_place || r.first_place === r.second_place) return false
    const validTeams = GROUP_TEAMS.get(r.group_letter)
    return validTeams?.has(r.first_place) && validTeams?.has(r.second_place)
  })
}

describe('bracket pick validation — GROUP_TEAMS filter', () => {
  it('accepts valid picks for Group A', () => {
    const rows = [{ group_letter: 'A', first_place: 'USA', second_place: 'Panama' }]
    expect(filterValidRows(rows)).toHaveLength(1)
  })

  it('rejects when first_place equals second_place', () => {
    const rows = [{ group_letter: 'A', first_place: 'USA', second_place: 'USA' }]
    expect(filterValidRows(rows)).toHaveLength(0)
  })

  it('rejects when team not in group', () => {
    const rows = [{ group_letter: 'A', first_place: 'Brazil', second_place: 'Panama' }]
    expect(filterValidRows(rows)).toHaveLength(0)
  })

  it('rejects when both teams not in group', () => {
    const rows = [{ group_letter: 'A', first_place: 'Brazil', second_place: 'France' }]
    expect(filterValidRows(rows)).toHaveLength(0)
  })

  it('rejects when first_place is empty', () => {
    const rows = [{ group_letter: 'A', first_place: '', second_place: 'Panama' }]
    expect(filterValidRows(rows)).toHaveLength(0)
  })

  it('rejects when second_place is empty', () => {
    const rows = [{ group_letter: 'A', first_place: 'USA', second_place: '' }]
    expect(filterValidRows(rows)).toHaveLength(0)
  })

  it('rejects cross-group picks (Group B teams in Group A slot)', () => {
    const rows = [{ group_letter: 'A', first_place: 'Mexico', second_place: 'Ecuador' }]
    expect(filterValidRows(rows)).toHaveLength(0)
  })

  it('accepts all 12 valid group picks', () => {
    const rows = WC2026_GROUPS.map(g => ({
      group_letter: g.letter,
      first_place: g.teams[0],
      second_place: g.teams[1],
    }))
    expect(filterValidRows(rows)).toHaveLength(12)
  })

  it('filters out invalid rows while keeping valid ones (partial submission)', () => {
    const rows = [
      { group_letter: 'A', first_place: 'USA', second_place: 'Panama' },       // valid
      { group_letter: 'B', first_place: 'Mexico', second_place: 'Mexico' },    // same team
      { group_letter: 'C', first_place: 'Canada', second_place: 'Morocco' },   // valid
      { group_letter: 'D', first_place: 'Brazil', second_place: 'Chile' },     // Brazil not in Group D
    ]
    expect(filterValidRows(rows)).toHaveLength(2)
  })

  it('skipped count equals total minus valid', () => {
    const letters = ['A','B','C','D','E','F','G','H','I','J','K','L']
    const rows = [
      { group_letter: 'A', first_place: 'USA', second_place: 'Panama' },
      { group_letter: 'B', first_place: 'Mexico', second_place: 'Ecuador' },
    ]
    const valid = filterValidRows(rows)
    const skipped = letters.length - valid.length
    expect(skipped).toBe(10)
  })
})

// ─── GROUP_TEAMS map integrity ────────────────────────────────────────────────

describe('GROUP_TEAMS map', () => {
  it('has all 12 groups', () => {
    expect(GROUP_TEAMS.size).toBe(12)
  })

  it('each group set has 4 teams', () => {
    GROUP_TEAMS.forEach(teams => {
      expect(teams.size).toBe(4)
    })
  })

  it('correctly identifies teams by group', () => {
    expect(GROUP_TEAMS.get('A')?.has('USA')).toBe(true)
    expect(GROUP_TEAMS.get('A')?.has('Brazil')).toBe(false)
    expect(GROUP_TEAMS.get('E')?.has('Brazil')).toBe(true)
  })
})
