import { describe, it, expect } from 'vitest'
import { computeBadges } from '../badges'
import type { BadgeInput } from '../badges'

const p = (points_earned: number | null, is_perfect: boolean | null = false, created_at = '2026-01-01'): BadgeInput =>
  ({ points_earned, is_perfect, created_at })

describe('computeBadges', () => {
  it('no badges for empty input', () => {
    const result = computeBadges([], 0)
    expect(result.every(b => !b.earned)).toBe(true)
  })

  it('first_pick earned with one prediction', () => {
    const result = computeBadges([p(null)], 0)
    expect(result.find(b => b.id === 'first_pick')?.earned).toBe(true)
  })

  it('perfect_score earned when any prediction is perfect', () => {
    const result = computeBadges([p(3, true), p(1, false)], 0)
    expect(result.find(b => b.id === 'perfect_score')?.earned).toBe(true)
  })

  it('perfect_score not earned without is_perfect', () => {
    const result = computeBadges([p(3, false)], 0)
    expect(result.find(b => b.id === 'perfect_score')?.earned).toBe(false)
  })

  it('hot_streak earned at streak of 3', () => {
    const preds = [
      p(3, false, '2026-01-03'),
      p(1, false, '2026-01-02'),
      p(3, false, '2026-01-01'),
    ]
    const result = computeBadges(preds, 0)
    expect(result.find(b => b.id === 'hot_streak')?.earned).toBe(true)
    expect(result.find(b => b.id === 'on_a_roll')?.earned).toBe(false)
  })

  it('on_a_roll earned at streak of 5', () => {
    const preds = [
      p(3, false, '2026-01-05'),
      p(1, false, '2026-01-04'),
      p(3, false, '2026-01-03'),
      p(1, false, '2026-01-02'),
      p(3, false, '2026-01-01'),
    ]
    const result = computeBadges(preds, 0)
    expect(result.find(b => b.id === 'hot_streak')?.earned).toBe(true)
    expect(result.find(b => b.id === 'on_a_roll')?.earned).toBe(true)
  })

  it('sharp earned at 70%+ accuracy with 5+ scored', () => {
    const preds = [
      p(3, false, '2026-01-05'),
      p(3, false, '2026-01-04'),
      p(3, false, '2026-01-03'),
      p(3, false, '2026-01-02'),
      p(0, false, '2026-01-01'),
    ]
    const result = computeBadges(preds, 0)
    expect(result.find(b => b.id === 'sharp')?.earned).toBe(true)
  })

  it('sharp not earned below 5 scored predictions', () => {
    const preds = [p(3, false), p(3, false), p(3, false), p(3, false)]
    const result = computeBadges(preds, 0)
    expect(result.find(b => b.id === 'sharp')?.earned).toBe(false)
  })

  it('sharp not earned below 70% accuracy', () => {
    const preds = [
      p(3, false, '2026-01-05'),
      p(0, false, '2026-01-04'),
      p(0, false, '2026-01-03'),
      p(0, false, '2026-01-02'),
      p(0, false, '2026-01-01'),
    ]
    const result = computeBadges(preds, 0)
    expect(result.find(b => b.id === 'sharp')?.earned).toBe(false)
  })

  it('veteran earned at 10+ predictions', () => {
    const preds = Array.from({ length: 10 }, (_, i) => p(null, null, `2026-01-${String(i + 1).padStart(2, '0')}`))
    const result = computeBadges(preds, 0)
    expect(result.find(b => b.id === 'veteran')?.earned).toBe(true)
  })

  it('veteran not earned with 9 predictions', () => {
    const preds = Array.from({ length: 9 }, () => p(null))
    const result = computeBadges(preds, 0)
    expect(result.find(b => b.id === 'veteran')?.earned).toBe(false)
  })

  it('wc_prophet earned with 12 group picks', () => {
    const result = computeBadges([], 12)
    expect(result.find(b => b.id === 'wc_prophet')?.earned).toBe(true)
  })

  it('wc_prophet not earned with 11 group picks', () => {
    const result = computeBadges([], 11)
    expect(result.find(b => b.id === 'wc_prophet')?.earned).toBe(false)
  })

  it('all badges earned simultaneously', () => {
    const preds = [
      p(3, true,  '2026-01-10'),
      p(3, false, '2026-01-09'),
      p(1, false, '2026-01-08'),
      p(3, false, '2026-01-07'),
      p(3, false, '2026-01-06'),
      p(1, false, '2026-01-05'),
      p(3, false, '2026-01-04'),
      p(3, false, '2026-01-03'),
      p(1, false, '2026-01-02'),
      p(3, false, '2026-01-01'),
    ]
    const result = computeBadges(preds, 12)
    expect(result.every(b => b.earned)).toBe(true)
  })
})
