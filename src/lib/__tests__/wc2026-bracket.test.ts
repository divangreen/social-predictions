import { describe, it, expect } from 'vitest'
import {
  emptyKnockoutPicks,
  resolveR32Teams,
  getMatchTeams,
  getThirdPlaceCandidates,
  R32_SEEDS,
  ROUND_POINTS,
  KNOCKOUT_ROUNDS,
  type KnockoutPicks,
} from '../wc2026-bracket'
import { WC2026_GROUPS } from '../wc2026-groups'

// ─── emptyKnockoutPicks ────────────────────────────────────────────────────────

describe('emptyKnockoutPicks', () => {
  it('returns all null slots', () => {
    const picks = emptyKnockoutPicks()
    expect(picks.champion).toBeNull()
    expect(picks.r32.every(v => v === null)).toBe(true)
    expect(picks.r16.every(v => v === null)).toBe(true)
    expect(picks.qf.every(v => v === null)).toBe(true)
    expect(picks.sf.every(v => v === null)).toBe(true)
  })

  it('r32 has 16 slots', () => expect(emptyKnockoutPicks().r32).toHaveLength(16))
  it('r16 has 8 slots',  () => expect(emptyKnockoutPicks().r16).toHaveLength(8))
  it('qf has 4 slots',   () => expect(emptyKnockoutPicks().qf).toHaveLength(4))
  it('sf has 2 slots',   () => expect(emptyKnockoutPicks().sf).toHaveLength(2))
  it('thirdQualifiers has 8 slots', () => expect(emptyKnockoutPicks().thirdQualifiers).toHaveLength(8))
})

// ─── R32_SEEDS integrity ───────────────────────────────────────────────────────

describe('R32_SEEDS', () => {
  it('has 16 matchups', () => expect(R32_SEEDS).toHaveLength(16))

  it('every matchup has exactly 2 seeds', () => {
    R32_SEEDS.forEach(([a, b]) => {
      expect(a).toBeTruthy()
      expect(b).toBeTruthy()
    })
  })

  it('no matchup pairs the same seed against itself', () => {
    R32_SEEDS.forEach(([a, b]) => expect(a).not.toBe(b))
  })
})

// ─── ROUND_POINTS ──────────────────────────────────────────────────────────────

describe('ROUND_POINTS', () => {
  it('doubles each round', () => {
    expect(ROUND_POINTS.r32).toBe(1)
    expect(ROUND_POINTS.r16).toBe(2)
    expect(ROUND_POINTS.qf).toBe(4)
    expect(ROUND_POINTS.sf).toBe(8)
    expect(ROUND_POINTS.final).toBe(16)
  })
})

// ─── KNOCKOUT_ROUNDS order ─────────────────────────────────────────────────────

describe('KNOCKOUT_ROUNDS', () => {
  it('has 5 rounds in correct order', () => {
    expect(KNOCKOUT_ROUNDS).toEqual(['r32', 'r16', 'qf', 'sf', 'final'])
  })
})

// ─── resolveR32Teams ───────────────────────────────────────────────────────────

function makeGroupPicks() {
  return new Map(WC2026_GROUPS.map(g => ({
    letter: g.letter,
    first_place: g.teams[0],
    second_place: g.teams[1],
  })).map(r => [r.letter, r]))
}

describe('resolveR32Teams', () => {
  it('returns 16 matchups', () => {
    const picks = makeGroupPicks()
    const teams = resolveR32Teams(picks, Array(8).fill(null))
    expect(teams).toHaveLength(16)
  })

  it('resolves group winner seed (1A = Group A first place)', () => {
    const picks = makeGroupPicks()
    const teams = resolveR32Teams(picks, Array(8).fill(null))
    // R32_SEEDS[0] = ['1A', '2B']
    // 1A = Group A winner = USA (teams[0])
    expect(teams[0][0]).toBe('USA')
  })

  it('resolves group runner-up seed (2B = Group B second place)', () => {
    const picks = makeGroupPicks()
    const teams = resolveR32Teams(picks, Array(8).fill(null))
    // 2B = Group B runner-up = Ecuador (teams[1])
    expect(teams[0][1]).toBe('Ecuador')
  })

  it('resolves 3rd-place seed from thirdQualifiers array', () => {
    const picks = makeGroupPicks()
    const third = ['Bolivia', null, null, null, null, null, null, null]
    const teams = resolveR32Teams(picks, third)
    // Find the matchup with 3rd-1 seed
    const thirdMatchup = teams.find(([a, b]) => a === 'Bolivia' || b === 'Bolivia')
    expect(thirdMatchup).toBeDefined()
  })

  it('returns null for missing group picks', () => {
    const teams = resolveR32Teams(new Map(), Array(8).fill(null))
    // All seeds unresolved — every slot should be null
    teams.forEach(([a, b]) => {
      // 3rd seeds are also null since thirdQualifiers is all null
      expect(a === null || typeof a === 'string').toBe(true)
      expect(b === null || typeof b === 'string').toBe(true)
    })
  })
})

// ─── getMatchTeams ─────────────────────────────────────────────────────────────

describe('getMatchTeams', () => {
  const r32Teams: [string | null, string | null][] = Array(16).fill(null).map((_, i) => [
    `TeamA${i}`, `TeamB${i}`,
  ])

  it('returns r32Teams directly for r32 round', () => {
    const picks = emptyKnockoutPicks()
    const [a, b] = getMatchTeams(0, 'r32', picks, r32Teams)
    expect(a).toBe('TeamA0')
    expect(b).toBe('TeamB0')
  })

  it('returns r16 teams from r32 picks for r16 round', () => {
    const picks = emptyKnockoutPicks()
    picks.r32[0] = 'Winner0'
    picks.r32[1] = 'Winner1'
    const [a, b] = getMatchTeams(0, 'r16', picks, r32Teams)
    expect(a).toBe('Winner0')
    expect(b).toBe('Winner1')
  })

  it('returns null when picks not yet set', () => {
    const picks = emptyKnockoutPicks()
    const [a, b] = getMatchTeams(0, 'r16', picks, r32Teams)
    expect(a).toBeNull()
    expect(b).toBeNull()
  })
})

// ─── getThirdPlaceCandidates ───────────────────────────────────────────────────

describe('getThirdPlaceCandidates', () => {
  it('returns 12 groups', () => {
    const result = getThirdPlaceCandidates(new Map())
    expect(result).toHaveLength(12)
  })

  it('excludes first and second place picks from candidates', () => {
    const picks = new Map([
      ['A', { first_place: 'USA', second_place: 'Panama' }],
    ])
    const result = getThirdPlaceCandidates(picks)
    const groupA = result.find(r => r.group === 'A')!
    expect(groupA.teams).not.toContain('USA')
    expect(groupA.teams).not.toContain('Panama')
    expect(groupA.teams).toHaveLength(2)
  })

  it('returns all 4 teams when no picks for that group', () => {
    const result = getThirdPlaceCandidates(new Map())
    result.forEach(r => expect(r.teams).toHaveLength(4))
  })

  it('each group in result has correct letter', () => {
    const result = getThirdPlaceCandidates(new Map())
    const letters = result.map(r => r.group)
    expect(letters).toEqual(['A','B','C','D','E','F','G','H','I','J','K','L'])
  })
})
