/**
 * Integration tests for savePrediction validation logic.
 * Tests the auth, lock, and score-validation rules that live inside the action
 * without importing the Next.js server action directly (which requires the full
 * Next.js runtime + 'use server' transform). The logic is reproduced here so
 * it can be tested in isolation; any change to the action must be reflected here.
 */
import { describe, it, expect } from 'vitest'

// ─── Logic extracted from savePrediction ─────────────────────────────────────

function validatePrediction(
  user: { id: string } | null,
  fixture: {
    status: string | null
    kickoff_time: string
    tournament_id: string
  } | null,
  sport: string | null,
  homeScore: number,
  awayScore: number
): { error: string | null } {
  if (!user) return { error: 'Not authenticated' }
  if (!fixture) return { error: 'Fixture not found' }

  if (fixture.status !== 'scheduled' || new Date(fixture.kickoff_time) <= new Date()) {
    return { error: 'Predictions are locked for this fixture' }
  }

  const maxScore = sport === 'basketball' ? 200 : 20

  if (
    !Number.isInteger(homeScore) || !Number.isInteger(awayScore) ||
    homeScore < 0 || awayScore < 0 ||
    homeScore > maxScore || awayScore > maxScore
  ) {
    return { error: 'Invalid score' }
  }

  return { error: null }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FUTURE = new Date(Date.now() + 86_400_000).toISOString()
const PAST   = new Date(Date.now() - 86_400_000).toISOString()
const USER   = { id: 'user-1' }

function fixture(overrides: Partial<{ status: string | null; kickoff_time: string }> = {}) {
  return { status: 'scheduled', kickoff_time: FUTURE, tournament_id: 'tour-1', ...overrides }
}

// ─── Auth check ───────────────────────────────────────────────────────────────

describe('savePrediction — auth check', () => {
  it('returns error when not authenticated', () => {
    expect(validatePrediction(null, fixture(), 'football', 1, 0).error).toBe('Not authenticated')
  })

  it('allows authenticated user', () => {
    expect(validatePrediction(USER, fixture(), 'football', 1, 0).error).toBeNull()
  })
})

// ─── Fixture existence ────────────────────────────────────────────────────────

describe('savePrediction — fixture check', () => {
  it('returns error when fixture not found', () => {
    expect(validatePrediction(USER, null, 'football', 1, 0).error).toBe('Fixture not found')
  })
})

// ─── Lock logic ───────────────────────────────────────────────────────────────

describe('savePrediction — lock check', () => {
  it('locks when status is live', () => {
    expect(validatePrediction(USER, fixture({ status: 'live' }), 'football', 1, 0).error).toMatch(/locked/)
  })

  it('locks when status is completed', () => {
    expect(validatePrediction(USER, fixture({ status: 'completed' }), 'football', 1, 0).error).toMatch(/locked/)
  })

  it('locks when kickoff has passed', () => {
    expect(validatePrediction(USER, fixture({ kickoff_time: PAST }), 'football', 1, 0).error).toMatch(/locked/)
  })

  it('locks when status is null', () => {
    expect(validatePrediction(USER, fixture({ status: null }), 'football', 1, 0).error).toMatch(/locked/)
  })

  it('allows prediction when scheduled and future', () => {
    expect(validatePrediction(USER, fixture(), 'football', 1, 0).error).toBeNull()
  })
})

// ─── Score validation — football ─────────────────────────────────────────────

describe('savePrediction — football score validation', () => {
  it('rejects negative home score', () => {
    expect(validatePrediction(USER, fixture(), 'football', -1, 0).error).toBe('Invalid score')
  })

  it('rejects negative away score', () => {
    expect(validatePrediction(USER, fixture(), 'football', 0, -1).error).toBe('Invalid score')
  })

  it('rejects score above 20', () => {
    expect(validatePrediction(USER, fixture(), 'football', 21, 0).error).toBe('Invalid score')
  })

  it('rejects float score', () => {
    expect(validatePrediction(USER, fixture(), 'football', 1.5, 0).error).toBe('Invalid score')
  })

  it('accepts 0-0', () => {
    expect(validatePrediction(USER, fixture(), 'football', 0, 0).error).toBeNull()
  })

  it('accepts max football score 20-20', () => {
    expect(validatePrediction(USER, fixture(), 'football', 20, 20).error).toBeNull()
  })
})

// ─── Score validation — basketball ───────────────────────────────────────────

describe('savePrediction — basketball score validation', () => {
  it('allows basketball score up to 200', () => {
    expect(validatePrediction(USER, fixture(), 'basketball', 105, 98).error).toBeNull()
  })

  it('rejects basketball score above 200', () => {
    expect(validatePrediction(USER, fixture(), 'basketball', 201, 0).error).toBe('Invalid score')
  })

  it('rejects football score above 20 even with null sport (defaults to 20)', () => {
    expect(validatePrediction(USER, fixture(), null, 21, 0).error).toBe('Invalid score')
  })

  it('accepts basketball max 200', () => {
    expect(validatePrediction(USER, fixture(), 'basketball', 200, 200).error).toBeNull()
  })
})
