'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function savePrediction(
  fixtureId: string,
  tournamentId: string,
  homeScore: number,
  awayScore: number
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify fixture is still open
  const { data: fixture } = await supabase
    .from('fixtures')
    .select('*')
    .eq('id', fixtureId)
    .single()

  if (!fixture) return { error: 'Fixture not found' }
  // Lock at kickoff rather than a fixed offset so last-minute postponements
  // (status stays 'scheduled') still block predictions once the clock passes.
  if (fixture.status !== 'scheduled' || new Date(fixture.kickoff_time) <= new Date()) {
    return { error: 'Predictions are locked for this fixture' }
  }

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('sport')
    .eq('id', fixture.tournament_id)
    .single()

  // Basketball scores routinely exceed 100; 200 is a generous upper bound that
  // still catches obvious typos (no football match ever reaches 200).
  const maxScore = tournament?.sport === 'basketball' ? 200 : 20

  if (
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
        predicted_home_score: homeScore,
        predicted_away_score: awayScore,
      },
      { onConflict: 'user_id,fixture_id' }
    )

  if (error) return { error: error.message }

  revalidatePath(`/tournaments/${tournamentId}`)
  return { error: null }
}
