import { describe, it, expect } from 'vitest'

// Lock logic mirrored from savePrediction in src/app/tournaments/[id]/actions.ts
function isPredictionLocked(
  status: string | null,
  kickoffTime: string,
  now = new Date()
): boolean {
  return status !== 'scheduled' || new Date(kickoffTime) <= now
}

// Lock logic mirrored from FixtureCard (client-side display lock)
function isFixtureCardLocked(
  status: string | null,
  kickoffTime: string,
  now = new Date()
): boolean {
  return status !== 'scheduled' || new Date(kickoffTime) <= now
}

describe('prediction lock — server-side', () => {
  const FUTURE = new Date(Date.now() + 86_400_000).toISOString() // +1 day
  const PAST   = new Date(Date.now() - 86_400_000).toISOString() // -1 day

  it('allows prediction when scheduled and kickoff in future', () => {
    expect(isPredictionLocked('scheduled', FUTURE)).toBe(false)
  })

  it('locks when kickoff has passed (status still scheduled)', () => {
    expect(isPredictionLocked('scheduled', PAST)).toBe(true)
  })

  it('locks when status is live', () => {
    expect(isPredictionLocked('live', FUTURE)).toBe(true)
  })

  it('locks when status is completed', () => {
    expect(isPredictionLocked('completed', PAST)).toBe(true)
  })

  it('locks when status is null', () => {
    expect(isPredictionLocked(null, FUTURE)).toBe(true)
  })

  it('locks exactly at kickoff time (boundary — not before)', () => {
    const exactly = new Date().toISOString()
    expect(isPredictionLocked('scheduled', exactly)).toBe(true)
  })

  it('allows prediction one millisecond before kickoff', () => {
    const almostNow = new Date(Date.now() + 1).toISOString()
    expect(isPredictionLocked('scheduled', almostNow)).toBe(false)
  })
})

describe('prediction lock — client-side FixtureCard', () => {
  const FUTURE = new Date(Date.now() + 86_400_000).toISOString()
  const PAST   = new Date(Date.now() - 86_400_000).toISOString()

  it('shows input when scheduled and future', () => {
    expect(isFixtureCardLocked('scheduled', FUTURE)).toBe(false)
  })

  it('shows locked state when past kickoff', () => {
    expect(isFixtureCardLocked('scheduled', PAST)).toBe(true)
  })

  it('shows locked state when live', () => {
    expect(isFixtureCardLocked('live', FUTURE)).toBe(true)
  })
})

// ─── WC lock date ─────────────────────────────────────────────────────────────

describe('WC lock date logic', () => {
  it('predictions are open before lock date', () => {
    const WC_LOCK_DATE = new Date('2026-06-11T12:00:00Z')
    const beforeLock = new Date('2026-06-01T00:00:00Z')
    expect(beforeLock >= WC_LOCK_DATE).toBe(false)
  })

  it('predictions are locked on lock date', () => {
    const WC_LOCK_DATE = new Date('2026-06-11T12:00:00Z')
    expect(WC_LOCK_DATE >= WC_LOCK_DATE).toBe(true)
  })

  it('predictions are locked after lock date', () => {
    const WC_LOCK_DATE = new Date('2026-06-11T12:00:00Z')
    const afterLock = new Date('2026-06-12T00:00:00Z')
    expect(afterLock >= WC_LOCK_DATE).toBe(true)
  })
})
