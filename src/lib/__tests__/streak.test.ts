import { describe, it, expect } from 'vitest'
import { computeStreak } from '../streak'

const pred = (points_earned: number | null, created_at: string) => ({ points_earned, created_at })

describe('computeStreak', () => {
  it('returns 0 for empty array', () => {
    expect(computeStreak([])).toBe(0)
  })

  it('returns 0 when all predictions are unscored', () => {
    expect(computeStreak([pred(null, '2026-01-01'), pred(null, '2026-01-02')])).toBe(0)
  })

  it('returns 0 when most recent scored is 0 points', () => {
    expect(computeStreak([
      pred(0, '2026-01-03'),
      pred(3, '2026-01-02'),
      pred(3, '2026-01-01'),
    ])).toBe(0)
  })

  it('counts consecutive correct from most recent', () => {
    expect(computeStreak([
      pred(3, '2026-01-03'),
      pred(1, '2026-01-02'),
      pred(0, '2026-01-01'),
    ])).toBe(2)
  })

  it('stops streak at first miss', () => {
    expect(computeStreak([
      pred(3, '2026-01-05'),
      pred(3, '2026-01-04'),
      pred(0, '2026-01-03'),
      pred(3, '2026-01-02'),
      pred(3, '2026-01-01'),
    ])).toBe(2)
  })

  it('ignores unscored (null) predictions in the middle', () => {
    expect(computeStreak([
      pred(3, '2026-01-04'),
      pred(null, '2026-01-03'),
      pred(3, '2026-01-02'),
      pred(0, '2026-01-01'),
    ])).toBe(2)
  })

  it('full streak when all scored are correct', () => {
    expect(computeStreak([
      pred(3, '2026-01-03'),
      pred(1, '2026-01-02'),
      pred(5, '2026-01-01'),
    ])).toBe(3)
  })

  it('sorts by date correctly regardless of input order', () => {
    expect(computeStreak([
      pred(0, '2026-01-01'),
      pred(3, '2026-01-03'),
      pred(3, '2026-01-02'),
    ])).toBe(2)
  })
})
