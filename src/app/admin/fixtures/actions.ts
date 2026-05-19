'use server'

import { createClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin'
import { revalidatePath } from 'next/cache'
import { generateFixtureBanter } from '@/lib/banter'

function getResult(home: number, away: number): 'home' | 'draw' | 'away' {
  if (home > away) return 'home'
  if (home < away) return 'away'
  return 'draw'
}

export async function saveFixtureResult(
  fixtureId: string,
  homeScore: number,
  awayScore: number
): Promise<{ error: string | null; scored?: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.id)) return { error: 'Unauthorized' }

  if (
    !Number.isInteger(homeScore) || !Number.isInteger(awayScore) ||
    homeScore < 0 || awayScore < 0 || homeScore > 20 || awayScore > 20
  ) {
    return { error: 'Invalid score' }
  }

  const { data: fixture, error: fixtureError } = await supabase
    .from('fixtures')
    .update({ home_score: homeScore, away_score: awayScore, status: 'completed' })
    .eq('id', fixtureId)
    .select()
    .single()

  if (fixtureError || !fixture) return { error: fixtureError?.message ?? 'Failed to update fixture' }

  // Fetch existing points_earned so we can calculate the delta below — this
  // supports admin re-scoring (score correction) without double-counting.
  const { data: predictions } = await supabase
    .from('predictions')
    .select('id, user_id, predicted_home_score, predicted_away_score, points_earned')
    .eq('fixture_id', fixtureId)

  if (!predictions?.length) {
    revalidatePath('/admin/fixtures')
    return { error: null }
  }

  const actualResult = getResult(homeScore, awayScore)
  const isUnderdogWin =
    (actualResult === 'home' && fixture.is_underdog_home) ||
    (actualResult === 'away' && fixture.is_underdog_away)

  // Scoring rules:
  //   3 pts — exact scoreline (e.g. 2-1 predicted, 2-1 actual)
  //   1 pt  — correct result only (home win / draw / away win)
  //  +1 pt  — bonus when the underdog team wins (flagged per-fixture by admin)
  const updates = predictions.map(p => {
    const exactMatch =
      p.predicted_home_score === homeScore &&
      p.predicted_away_score === awayScore
    const predictedResult = getResult(p.predicted_home_score, p.predicted_away_score)
    const correctResult = predictedResult === actualResult

    let points = 0
    if (exactMatch) points = 3
    else if (correctResult) points = 1
    if (correctResult && isUnderdogWin) points += 1

    return {
      id: p.id,
      user_id: p.user_id,
      points_earned: points,
      is_perfect: exactMatch,
      status: 'scored' as const,
    }
  })

  // Batch update predictions
  await Promise.all(
    updates.map(u =>
      supabase
        .from('predictions')
        .update({ points_earned: u.points_earned, is_perfect: u.is_perfect, status: u.status })
        .eq('id', u.id)
    )
  )

  // Use (newPoints − oldPoints) per user so re-scoring a fixture applies only
  // the difference rather than adding points on top of a previous scoring pass.
  const deltaByUser = new Map<string, number>()
  updates.forEach(u => {
    const oldPts = predictions.find(p => p.id === u.id)?.points_earned ?? 0
    const delta = u.points_earned - oldPts
    deltaByUser.set(u.user_id, (deltaByUser.get(u.user_id) ?? 0) + delta)
  })

  await Promise.all(
    Array.from(deltaByUser.entries()).map(async ([userId, delta]) => {
      if (delta === 0) return
      const { data: userRow } = await supabase
        .from('users')
        .select('total_points')
        .eq('id', userId)
        .single()
      // Math.max(0) prevents the total going negative if scores are corrected downward
      return supabase
        .from('users')
        .update({ total_points: Math.max(0, (userRow?.total_points ?? 0) + delta) })
        .eq('id', userId)
    })
  )

  // Generate AI banter — fire-and-forget, never blocks the scoring result
  const userIds = updates.map(u => u.user_id)
  const { data: userRows } = await supabase
    .from('users')
    .select('id, username')
    .in('id', userIds)

  const usernameMap = new Map((userRows ?? []).map(u => [u.id, u.username ?? 'Unknown']))

  const banterPredictions = updates.map(u => ({
    username: usernameMap.get(u.user_id) ?? 'Unknown',
    predictedHome: predictions.find(p => p.id === u.id)!.predicted_home_score,
    predictedAway: predictions.find(p => p.id === u.id)!.predicted_away_score,
    correct: u.points_earned > 0,
    perfect: u.is_perfect,
  }))

  generateFixtureBanter(
    fixture.home_team_name,
    fixture.away_team_name,
    homeScore,
    awayScore,
    banterPredictions
  ).then(banter => {
    if (banter) {
      supabase.from('fixtures').update({ ai_banter: banter }).eq('id', fixtureId)
    }
  })

  revalidatePath('/admin/fixtures')
  revalidatePath(`/tournaments/${fixture.tournament_id}`)
  return { error: null, scored: updates.length }
}
