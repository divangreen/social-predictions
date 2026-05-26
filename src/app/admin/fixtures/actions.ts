'use server'

import { createClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin'
import { revalidatePath } from 'next/cache'
import { generateFixtureBanter } from '@/lib/banter'
import { calcPoints, getResult } from '@/lib/scoring'

export async function saveFixtureResult(
  fixtureId: string,
  homeScore: number,
  awayScore: number,
  isUnderdogHome = false,
  isUnderdogAway = false,
): Promise<{ error: string | null; scored?: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.id)) return { error: 'Unauthorized' }

  // Validate before touching the DB
  const { data: fixtureCheck } = await supabase
    .from('fixtures')
    .select('tournament_id, home_team_name, away_team_name, is_underdog_home, is_underdog_away')
    .eq('id', fixtureId)
    .single()

  if (!fixtureCheck) return { error: 'Fixture not found' }

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('sport')
    .eq('id', fixtureCheck.tournament_id)
    .single()
  const maxScore = tournament?.sport === 'basketball' ? 200 : 20

  if (
    !Number.isInteger(homeScore) || !Number.isInteger(awayScore) ||
    homeScore < 0 || awayScore < 0 || homeScore > maxScore || awayScore > maxScore
  ) {
    return { error: 'Invalid score' }
  }

  const { data: fixture, error: fixtureError } = await supabase
    .from('fixtures')
    .update({ home_score: homeScore, away_score: awayScore, status: 'completed', is_underdog_home: isUnderdogHome, is_underdog_away: isUnderdogAway })
    .eq('id', fixtureId)
    .select()
    .single()

  if (fixtureError || !fixture) return { error: fixtureError?.message ?? 'Failed to update fixture' }

  // Fetch existing points_earned so we can calculate the delta below — this
  // supports admin re-scoring (score correction) without double-counting.
  const { data: predictions } = await supabase
    .from('predictions')
    .select('id, user_id, prediction_type, predicted_home_score, predicted_away_score, predicted_result, points_earned')
    .eq('fixture_id', fixtureId)

  if (!predictions?.length) {
    revalidatePath('/admin/fixtures')
    return { error: null }
  }

  const actualResult = getResult(homeScore, awayScore)
  const isUnderdogWin =
    (actualResult === 'home' && fixture.is_underdog_home) ||
    (actualResult === 'away' && fixture.is_underdog_away)

  const updates = predictions.map(p => {
    const pick = p.prediction_type === 'result'
      ? { type: 'result' as const, predictedResult: (p.predicted_result ?? 'draw') as 'home' | 'draw' | 'away' }
      : { type: 'score' as const, predictedHome: p.predicted_home_score ?? 0, predictedAway: p.predicted_away_score ?? 0 }

    const { points, isExact } = calcPoints(pick, homeScore, awayScore, !!isUnderdogWin)

    return {
      id: p.id,
      user_id: p.user_id,
      points_earned: points,
      is_perfect: isExact,
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
    Array.from(deltaByUser.entries()).map(([userId, delta]) => {
      if (delta === 0) return Promise.resolve()
      return supabase.rpc('increment_user_points', { p_user_id: userId, p_delta: delta })
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
      return supabase.from('fixtures').update({ ai_banter: banter }).eq('id', fixtureId)
    }
  }).catch(console.error)

  revalidatePath('/admin/fixtures')
  revalidatePath(`/tournaments/${fixture.tournament_id}`)
  return { error: null, scored: updates.length }
}
