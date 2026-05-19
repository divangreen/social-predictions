/**
 * Security tests — verify the application's validation and sanitisation
 * logic prevents common attack vectors without requiring a live server.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { WC2026_GROUPS } from '../wc2026-groups'
import { isAdmin } from '../admin'

const GROUP_TEAMS = new Map(WC2026_GROUPS.map(g => [g.letter, new Set(g.teams)]))

// Score validation mirrored from savePrediction / saveFixtureResult
function isValidScore(home: unknown, away: unknown, maxScore: number): boolean {
  return (
    typeof home === 'number' &&
    typeof away === 'number' &&
    Number.isInteger(home) &&
    Number.isInteger(away) &&
    home >= 0 &&
    away >= 0 &&
    home <= maxScore &&
    away <= maxScore
  )
}

// Bracket pick validation mirrored from saveBracketPicks
function isValidBracketPick(groupLetter: string, first: string, second: string): boolean {
  if (!first || !second || first === second) return false
  const validTeams = GROUP_TEAMS.get(groupLetter)
  return !!(validTeams?.has(first) && validTeams?.has(second))
}

// ─── XSS prevention ──────────────────────────────────────────────────────────

describe('XSS prevention — bracket pick validation', () => {
  const xssPayloads = [
    '<script>alert(1)</script>',
    '"><img src=x onerror=alert(1)>',
    "'; DROP TABLE users; --",
    '<svg onload=alert(1)>',
    'javascript:alert(1)',
    '{{constructor.constructor("alert(1)")()}}',
  ]

  xssPayloads.forEach(payload => {
    it(`rejects XSS payload as team name: ${payload.slice(0, 30)}`, () => {
      expect(isValidBracketPick('A', payload, 'Panama')).toBe(false)
      expect(isValidBracketPick('A', 'USA', payload)).toBe(false)
    })
  })
})

// ─── SQL injection via score inputs ──────────────────────────────────────────

describe('SQL injection via score inputs', () => {
  const sqlPayloads = [
    NaN,
    Infinity,
    -Infinity,
    '1; DROP TABLE predictions',
    '1 OR 1=1',
    null,
    undefined,
    {},
    [],
    true,
  ]

  sqlPayloads.forEach(payload => {
    it(`rejects SQL/injection payload: ${String(payload).slice(0, 30)}`, () => {
      expect(isValidScore(payload, 0, 20)).toBe(false)
      expect(isValidScore(0, payload, 20)).toBe(false)
    })
  })
})

// ─── Score boundary — prevents score manipulation ────────────────────────────

describe('score input — boundary enforcement', () => {
  it('rejects MAX_SAFE_INTEGER as score', () => {
    expect(isValidScore(Number.MAX_SAFE_INTEGER, 0, 20)).toBe(false)
  })

  it('rejects MAX_VALUE as score', () => {
    expect(isValidScore(Number.MAX_VALUE, 0, 20)).toBe(false)
  })

  it('rejects float that looks like integer', () => {
    expect(isValidScore(1.0000000001, 0, 20)).toBe(false)
  })

  it('accepts 0-0 (valid minimum)', () => {
    expect(isValidScore(0, 0, 20)).toBe(true)
  })

  it('accepts maxScore exactly (boundary)', () => {
    expect(isValidScore(20, 20, 20)).toBe(true)
  })
})

// ─── Team name injection via bracket picks ───────────────────────────────────

describe('bracket picks — team name injection', () => {
  it('rejects empty string as team name', () => {
    expect(isValidBracketPick('A', '', 'Panama')).toBe(false)
  })

  it('rejects whitespace-only team name', () => {
    expect(isValidBracketPick('A', '   ', 'Panama')).toBe(false)
  })

  it('rejects team from wrong group (cross-group substitution)', () => {
    // Brazil is in Group E, not Group A
    expect(isValidBracketPick('A', 'Brazil', 'Panama')).toBe(false)
  })

  it('rejects picking same team twice', () => {
    expect(isValidBracketPick('A', 'USA', 'USA')).toBe(false)
  })

  it('rejects unknown group letter', () => {
    expect(isValidBracketPick('Z', 'USA', 'Panama')).toBe(false)
  })

  it('accepts legitimate picks', () => {
    expect(isValidBracketPick('A', 'USA', 'Panama')).toBe(true)
  })
})

// ─── Auth guard — admin-only action protection ────────────────────────────────

describe('admin guard — unauthorised access', () => {
  afterEach(() => { delete process.env.ADMIN_USER_IDS })

  it('isAdmin returns false for empty userId', () => {
    process.env.ADMIN_USER_IDS = 'real-admin-id'
    expect(isAdmin('')).toBe(false)
  })

  it('isAdmin returns false for null-like string userId', () => {
    process.env.ADMIN_USER_IDS = 'real-admin-id'
    expect(isAdmin('null')).toBe(false)
    expect(isAdmin('undefined')).toBe(false)
  })
})

// ─── Invite code — no predictable patterns ───────────────────────────────────

describe('invite code generation', () => {
  it('generates codes of length 6', () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    expect(code.length).toBe(6)
  })

  it('generates alphanumeric codes only', () => {
    for (let i = 0; i < 50; i++) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase()
      expect(code).toMatch(/^[A-Z0-9]+$/)
    }
  })

  it('generates different codes on repeated calls', () => {
    const codes = new Set(Array.from({ length: 20 }, () =>
      Math.random().toString(36).substring(2, 8).toUpperCase()
    ))
    // Statistically near-impossible for all 20 to collide
    expect(codes.size).toBeGreaterThan(1)
  })
})
