'use server'

import { createClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin'
import { revalidatePath } from 'next/cache'

function getResult(home: number, away: number): 'home' | 'draw' | 'away' {
  if (home > away) return 'home'
  if (home < away) return 'away'
  return 'draw'
}

export async function saveFixtureResult(
  fixtureId: string,
  homeScore: number,
  awayScore: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.id)) return { error: 'Unauthorized' }

  if (
    !Number.isInteger(homeScore) || !Number.isInteger(awayScore) ||
    homeScore < 0 || awayScore < 0 || homeScore > 20 || awayScore > 20
  ) {
    return { error: 'Invalid score' }
  }

  // Update fixture
  const { data: fixture, error: fixtureError } = await supabase
    .from('fixtures')
    .update({ home_score: homeScore, away_score: awayScore, status: 'completed' })
    .eq('id', fixtureId)
    .select()
    .single()

  if (fixtureError || !fixture) return { error: fixtureError?.message ?? 'Failed to update fixture' }

  // Fetch all predictions for this fixture (including existing points to compute delta on re-score)
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

  // Score each prediction
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

  // Apply point deltas (new - old) per user to prevent double-increment on re-score
  const deltaByUser = new Map<string, number>()
  updates.forEach(u => {
    const oldPts = predictions.find(p => p.id === u.id)?.points_earned ?? 0
    const delta = u.points_earned - oldPts
    deltaByUser.set(u.user_id, (deltaByUser.get(u.user_id) ?? 0) + delta)
  })

  await Promise.all(
    Array.from(deltaByUser.entries()).map(async ([userId, delta]) => {
      if (delta === 0) return
      const { data: currentUser } = await supabase
        .from('users')
        .select('total_points')
        .eq('id', userId)
        .single()
      return supabase
        .from('users')
        .update({ total_points: Math.max(0, (currentUser?.total_points ?? 0) + delta) })
        .eq('id', userId)
    })
  )

  revalidatePath('/admin/fixtures')
  revalidatePath(`/tournaments/${fixture.tournament_id}`)
  return { error: null, scored: updates.length }
}
