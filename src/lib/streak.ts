export type ScoredPrediction = {
  points_earned: number | null
  created_at: string
}

export function computeStreak(predictions: ScoredPrediction[]): number {
  const sorted = predictions
    .filter(p => p.points_earned !== null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  let streak = 0
  for (const p of sorted) {
    if ((p.points_earned ?? 0) > 0) streak++
    else break
  }
  return streak
}
