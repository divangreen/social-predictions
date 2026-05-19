import { describe, it, expect } from 'vitest'
import { WC2026_GROUPS, WC_TOURNAMENT_ID, WC_LOCK_DATE } from '../wc2026-groups'

describe('WC2026_GROUPS — data integrity', () => {
  it('has exactly 12 groups', () => {
    expect(WC2026_GROUPS).toHaveLength(12)
  })

  it('groups are labelled A through L in order', () => {
    const letters = WC2026_GROUPS.map(g => g.letter)
    expect(letters).toEqual(['A','B','C','D','E','F','G','H','I','J','K','L'])
  })

  it('every group has exactly 4 teams', () => {
    WC2026_GROUPS.forEach(g => {
      expect(g.teams).toHaveLength(4)
    })
  })

  it('no duplicate teams within a group', () => {
    WC2026_GROUPS.forEach(g => {
      const unique = new Set(g.teams)
      expect(unique.size).toBe(4)
    })
  })

  it('no team appears in more than one group', () => {
    const allTeams = WC2026_GROUPS.flatMap(g => g.teams)
    const unique = new Set(allTeams)
    expect(unique.size).toBe(allTeams.length)
  })

  it('has exactly 48 teams total', () => {
    const allTeams = WC2026_GROUPS.flatMap(g => g.teams)
    expect(allTeams).toHaveLength(48)
  })

  it('no team name is empty or whitespace', () => {
    WC2026_GROUPS.forEach(g => {
      g.teams.forEach(t => {
        expect(t.trim().length).toBeGreaterThan(0)
      })
    })
  })
})

describe('WC_TOURNAMENT_ID', () => {
  it('is a non-empty string', () => {
    expect(typeof WC_TOURNAMENT_ID).toBe('string')
    expect(WC_TOURNAMENT_ID.length).toBeGreaterThan(0)
  })
})

describe('WC_LOCK_DATE', () => {
  it('is a valid Date', () => {
    expect(WC_LOCK_DATE).toBeInstanceOf(Date)
    expect(isNaN(WC_LOCK_DATE.getTime())).toBe(false)
  })

  it('is in the future relative to January 2026', () => {
    const jan2026 = new Date('2026-01-01')
    expect(WC_LOCK_DATE.getTime()).toBeGreaterThan(jan2026.getTime())
  })

  it('is set to June 2026', () => {
    expect(WC_LOCK_DATE.getFullYear()).toBe(2026)
    expect(WC_LOCK_DATE.getMonth()).toBe(5) // June = 5
  })
})
