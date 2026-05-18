import { computeStreak } from './streak'

export type Badge = {
  id: string
  emoji: string
  name: string
  description: string
}

export const ALL_BADGES: Badge[] = [
  { id: 'first_pick',    emoji: '🎯', name: 'First Pick',    description: 'Made your first prediction' },
  { id: 'perfect_score', emoji: '💎', name: 'Perfect Score', description: 'Nailed an exact scoreline' },
  { id: 'hot_streak',    emoji: '🔥', name: 'Hot Streak',    description: '3 correct picks in a row' },
  { id: 'on_a_roll',     emoji: '⚡', name: 'On A Roll',     description: '5 correct picks in a row' },
  { id: 'sharp',         emoji: '🎓', name: 'Sharp',         description: '70%+ accuracy on 5+ scored picks' },
  { id: 'veteran',       emoji: '🏅', name: 'Veteran',       description: '10 predictions placed' },
  { id: 'wc_prophet',    emoji: '🌍', name: 'WC Prophet',    description: 'Filled all 12 World Cup groups' },
]

export type EarnedBadge = Badge & { earned: boolean }

export type BadgeInput = {
  points_earned: number | null
  is_perfect: boolean | null
  created_at: string
}

export function computeBadges(
  predictions: BadgeInput[],
  wcGroupPicksCount: number
): EarnedBadge[] {
  const scored = predictions.filter(p => p.points_earned !== null)
  const correct = scored.filter(p => (p.points_earned ?? 0) > 0)
  const streak = computeStreak(predictions)
  const accuracy = scored.length >= 5 ? correct.length / scored.length : 0

  const earned = new Set<string>()
  if (predictions.length >= 1) earned.add('first_pick')
  if (predictions.some(p => p.is_perfect)) earned.add('perfect_score')
  if (streak >= 3) earned.add('hot_streak')
  if (streak >= 5) earned.add('on_a_roll')
  if (accuracy >= 0.7) earned.add('sharp')
  if (predictions.length >= 10) earned.add('veteran')
  if (wcGroupPicksCount >= 12) earned.add('wc_prophet')

  return ALL_BADGES.map(b => ({ ...b, earned: earned.has(b.id) }))
}
