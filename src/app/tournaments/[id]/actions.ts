'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import type { PredictionResult } from '@/lib/scoring'

export async function savePrediction(
  fixtureId: string,
  tournamentId: string,
  homeScore: number | null,
  awayScore: number | null,
  predictionType: 'score' | 'result' = 'score',
  predictedResult: PredictionResult | null = null,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: fixture } = await supabase
    .from('fixtures')
    .select('*')
    .eq('id', fixtureId)
    .single()

  if (!fixture) return { error: 'Fixture not found' }
  if (fixture.status !== 'scheduled' || new Date(fixture.kickoff_time) <= new Date()) {
    return { error: 'Predictions are locked for this fixture' }
  }

  if (predictionType === 'result') {
    if (!predictedResult || !['home', 'draw', 'away'].includes(predictedResult)) {
      return { error: 'Invalid result pick' }
    }
    const { error } = await supabase
      .from('predictions')
      .upsert(
        {
          user_id: user.id,
          fixture_id: fixtureId,
          prediction_type: 'result',
          predicted_result: predictedResult,
          predicted_home_score: null,
          predicted_away_score: null,
        },
        { onConflict: 'user_id,fixture_id' }
      )
    if (error) return { error: error.message }
  } else {
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('sport')
      .eq('id', fixture.tournament_id)
      .single()

    const maxScore = tournament?.sport === 'basketball' ? 200 : 20

    if (
      homeScore === null || awayScore === null ||
      !Number.isInteger(homeScore) || !Number.isInteger(awayScore) ||
      homeScore < 0 || awayScore < 0 || homeScore > maxScore || awayScore > maxScore
    ) {
      return { error: 'Invalid score' }
    }

    const { error } = await supabase
      .from('predictions')
      .upsert(
        {
          user_id: user.id,
          fixture_id: fixtureId,
          prediction_type: 'score',
          predicted_home_score: homeScore,
          predicted_away_score: awayScore,
          predicted_result: null,
        },
        { onConflict: 'user_id,fixture_id' }
      )
    if (error) return { error: error.message }
  }

  revalidatePath(`/tournaments/${tournamentId}`)
  return { error: null }
}
