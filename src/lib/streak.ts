export type ScoredPrediction = {
  points_earned: number | null
  created_at: string
  kickoff_time?: string | null
}

export function computeStreak(predictions: ScoredPrediction[]): number {
  const sorted = predictions
    .filter(p => p.points_earned !== null)
    .sort((a, b) => {
      const aTime = a.kickoff_time ?? a.created_at
      const bTime = b.kickoff_time ?? b.created_at
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })

  let streak = 0
  for (const p of sorted) {
    if ((p.points_earned ?? 0) > 0) streak++
    else break
  }
  return streak
}
