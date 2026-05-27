import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogoutButton } from '../tournaments/_components/LogoutButton'
import { computeStreak } from '@/lib/streak'
import { computeBadges } from '@/lib/badges'
import { WC_TOURNAMENT_ID } from '@/lib/wc2026-groups'
import { DeletePredictionsPanel } from './_components/DeletePredictionsPanel'
import type { PredictionRow } from './_components/DeletePredictionsPanel'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: predictions }, { data: leagues }, { count: wcGroupCount }] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('predictions').select('*').eq('user_id', user.id),
    supabase.from('league_members').select('league_id').eq('user_id', user.id),
    supabase
      .from('bracket_predictions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('tournament_id', WC_TOURNAMENT_ID),
  ])

  const allPredictions = predictions ?? []
  const scored = allPredictions.filter(p => p.points_earned !== null)
  const totalPoints = scored.reduce((sum, p) => sum + (p.points_earned ?? 0), 0)
  const perfectScores = scored.filter(p => p.is_perfect).length
  const correct = scored.filter(p => (p.points_earned ?? 0) > 0).length
  const accuracy = scored.length > 0 ? Math.round((correct / scored.length) * 100) : 0
  const leagueCount = leagues?.length ?? 0
  const badges = computeBadges(allPredictions, wcGroupCount ?? 0)
  const earnedBadges = badges.filter(b => b.earned)

  // Global percentile
  const [{ count: usersAbove }, { count: totalActiveUsers }] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).gt('total_points', totalPoints),
    supabase.from('users').select('*', { count: 'exact', head: true }).not('total_points', 'is', null),
  ])
  const percentileRank = (totalActiveUsers ?? 0) >= 5
    ? Math.max(1, Math.round(((usersAbove ?? 0) / (totalActiveUsers ?? 1)) * 100))
    : null

  // DNA stats
  const scorePreds = allPredictions.filter(p => p.prediction_type === 'score')
  const resultPreds = allPredictions.filter(p => p.prediction_type === 'result')
  const scoredScorePreds = scorePreds.filter(p => p.points_earned !== null)
  const scoredResultPreds = resultPreds.filter(p => p.points_earned !== null)
  const scoreAcc = scoredScorePreds.length > 0
    ? Math.round((scoredScorePreds.filter(p => (p.points_earned ?? 0) > 0).length / scoredScorePreds.length) * 100) : null
  const resultAcc = scoredResultPreds.length > 0
    ? Math.round((scoredResultPreds.filter(p => (p.points_earned ?? 0) > 0).length / scoredResultPreds.length) * 100) : null

  const homeCount = allPredictions.filter(p => p.predicted_result === 'home').length
  const drawCount = allPredictions.filter(p => p.predicted_result === 'draw').length
  const awayCount = allPredictions.filter(p => p.predicted_result === 'away').length

  const scoredHomePreds = allPredictions.filter(p => p.predicted_result === 'home' && p.points_earned !== null)
  const scoredDrawPreds = allPredictions.filter(p => p.predicted_result === 'draw' && p.points_earned !== null)
  const scoredAwayPreds = allPredictions.filter(p => p.predicted_result === 'away' && p.points_earned !== null)
  const homeAcc = scoredHomePreds.length > 0 ? Math.round((scoredHomePreds.filter(p => (p.points_earned ?? 0) > 0).length / scoredHomePreds.length) * 100) : null
  const drawAcc = scoredDrawPreds.length > 0 ? Math.round((scoredDrawPreds.filter(p => (p.points_earned ?? 0) > 0).length / scoredDrawPreds.length) * 100) : null
  const awayAcc = scoredAwayPreds.length > 0 ? Math.round((scoredAwayPreds.filter(p => (p.points_earned ?? 0) > 0).length / scoredAwayPreds.length) * 100) : null

  const showDna = allPredictions.length >= 3

  // Fetch fixtures for all predictions (streak + delete panel)
  const allFixtureIds = [...new Set(allPredictions.map(p => p.fixture_id))]
  const { data: allFixtures } = allFixtureIds.length
    ? await supabase.from('fixtures').select('id, home_team_name, away_team_name, home_score, away_score, kickoff_time, status').in('id', allFixtureIds)
    : { data: [] }

  const fixtureMap = new Map((allFixtures ?? []).map(f => [f.id, f]))

  // Compute streak using fixture kickoff_time so consecutive match wins are counted correctly
  const streak = computeStreak(
    allPredictions.map(p => ({
      points_earned: p.points_earned,
      created_at: p.created_at,
      kickoff_time: fixtureMap.get(p.fixture_id)?.kickoff_time ?? null,
    }))
  )

  // Recent Results: driven by completed fixtures, not picks
  const { data: recentFixtures } = await supabase
    .from('fixtures')
    .select('id, home_team_name, away_team_name, home_score, away_score, kickoff_time, status')
    .eq('status', 'completed')
    .order('kickoff_time', { ascending: false })
    .limit(8)

  const predByFixture = new Map(allPredictions.map(p => [p.fixture_id, p]))

  const username = profile?.username ?? user.email?.split('@')[0] ?? 'User'

  // Predictions for the delete panel — sorted: unscored first, then scored
  const deleteRows: PredictionRow[] = allPredictions
    .slice()
    .sort((a, b) => {
      const aScored = a.points_earned !== null ? 1 : 0
      const bScored = b.points_earned !== null ? 1 : 0
      if (aScored !== bScored) return aScored - bScored
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    .map(p => {
      const f = fixtureMap.get(p.fixture_id)
      return {
        id: p.id,
        homeTeam: f?.home_team_name ?? '?',
        awayTeam: f?.away_team_name ?? '?',
        kickoffTime: f?.kickoff_time ?? p.created_at,
        fixtureStatus: f?.status ?? null,
        predictionType: p.prediction_type as 'score' | 'result',
        predictedHome: p.predicted_home_score,
        predictedAway: p.predicted_away_score,
        predictedResult: p.predicted_result as 'home' | 'draw' | 'away' | null,
        pointsEarned: p.points_earned,
        isPerfect: p.is_perfect,
      }
    })

  return (
    <main className="min-h-screen bg-pitch px-4 py-8">
      <div className="mx-auto max-w-lg">

        <div className="mb-6 flex items-center justify-between">
          <Link href="/tournaments" className="text-sm text-fg-3 transition hover:text-fg-2">
            ← Tournaments
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/pro"
              className="rounded-full bg-gold/10 px-3 py-1 text-xs font-black text-gold transition hover:bg-gold/20"
            >
              Pro
            </Link>
            <LogoutButton />
          </div>
        </div>

        {/* Profile card */}
        <div className="mb-6 rounded-2xl border border-border bg-surface-1 p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-2 text-2xl font-black text-fg-1">
              {username[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black text-fg-1">{username}</h1>
              <p className="truncate text-sm text-fg-3">{user.email}</p>
              {percentileRank !== null && (
                <p className="mt-0.5 text-xs font-bold text-gold">
                  Top {percentileRank}% of predictors
                </p>
              )}
            </div>
          </div>

          {/* Stats scoreboard */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              { label: 'Points', value: String(totalPoints), highlight: true },
              { label: 'Accuracy', value: `${accuracy}%`, highlight: false },
              { label: 'Picks', value: String(allPredictions.length), highlight: false },
              { label: 'Leagues', value: String(leagueCount), highlight: false },
            ] as const).map(stat => (
              <div key={stat.label} className="rounded-xl bg-surface-2 p-3 text-center">
                <p className={`font-mono text-xl font-black ${stat.highlight ? 'text-gold' : 'text-fg-1'}`}>
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-fg-3">{stat.label}</p>
              </div>
            ))}
          </div>

          {streak >= 2 && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-orange-500/10 px-4 py-3">
              <span className="text-xl">🔥</span>
              <p className="text-sm font-black text-orange-400">
                {streak} pick streak — keep it going!
              </p>
            </div>
          )}
          {streak === 1 && (
            <p className="mt-4 text-center text-sm font-bold text-orange-400">🔥 1 pick streak</p>
          )}

          {perfectScores > 0 && (
            <p className="mt-4 text-center text-sm font-bold text-goal">
              🎯 {perfectScores} perfect {perfectScores === 1 ? 'score' : 'scores'}
            </p>
          )}
        </div>

        {/* Prediction DNA */}
        {showDna && (
          <div className="mb-6">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-fg-3">Prediction DNA</h2>
            <div className="rounded-2xl border border-border bg-surface-1 p-4 space-y-4">

              {/* Score vs Result */}
              <div>
                <p className="mb-2 text-xs font-bold text-fg-3 uppercase tracking-wider">Pick style</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-surface-2 p-3 text-center">
                    <p className="font-mono text-lg font-black text-fg-1">{scorePreds.length}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-fg-3">Score picks</p>
                    {scoreAcc !== null && (
                      <p className="mt-0.5 text-xs font-bold text-goal">{scoreAcc}% hit</p>
                    )}
                  </div>
                  <div className="rounded-xl bg-surface-2 p-3 text-center">
                    <p className="font-mono text-lg font-black text-fg-1">{resultPreds.length}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-fg-3">Result picks</p>
                    {resultAcc !== null && (
                      <p className="mt-0.5 text-xs font-bold text-goal">{resultAcc}% hit</p>
                    )}
                  </div>
                </div>
              </div>

              {/* H/D/A breakdown */}
              {(homeCount + drawCount + awayCount) > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold text-fg-3 uppercase tracking-wider">Result bias</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { label: 'Home', count: homeCount, acc: homeAcc },
                      { label: 'Draw', count: drawCount, acc: drawAcc },
                      { label: 'Away', count: awayCount, acc: awayAcc },
                    ]).map(({ label, count, acc }) => (
                      <div key={label} className="rounded-xl bg-surface-2 p-3 text-center">
                        <p className="font-mono text-lg font-black text-fg-1">{count}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-fg-3">{label}</p>
                        {acc !== null && (
                          <p className="mt-0.5 text-xs font-bold text-goal">{acc}%</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Badges */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-fg-3">Badges</h2>
            <span className="text-xs text-fg-3">{earnedBadges.length}/{badges.length}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {badges.map(badge => (
              <div
                key={badge.id}
                title={badge.earned ? badge.description : `Locked: ${badge.description}`}
                className={`flex flex-col items-center gap-1 rounded-xl p-3 text-center transition ${
                  badge.earned
                    ? 'bg-surface-1 border border-border'
                    : 'bg-surface-1 border border-border opacity-30 grayscale'
                }`}
              >
                <span className="text-2xl">{badge.emoji}</span>
                <p className="text-[10px] font-bold leading-tight text-fg-2">{badge.name}</p>
              </div>
            ))}
          </div>
          {earnedBadges.length === 0 && (
            <p className="mt-3 text-center text-xs text-fg-3">
              Make predictions to unlock badges
            </p>
          )}
        </div>

        {/* Recent results */}
        {(recentFixtures ?? []).length > 0 ? (
          <>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-fg-3">Recent Results</h2>
            <div className="mb-6 space-y-2">
              {(recentFixtures ?? []).map(fixture => {
                const pred = predByFixture.get(fixture.id)
                const pts = pred?.points_earned ?? null
                return (
                  <div key={fixture.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface-1 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-bold text-fg-1">
                        {fixture.home_team_name} {fixture.home_score}–{fixture.away_score} {fixture.away_team_name}
                      </p>
                      {pred ? (
                        <p className="font-mono text-xs text-fg-3">
                          My pick:{' '}
                          {pred.prediction_type === 'result'
                            ? pred.predicted_result === 'home'
                              ? `${fixture.home_team_name} win`
                              : pred.predicted_result === 'away'
                              ? `${fixture.away_team_name} win`
                              : 'Draw'
                            : `${pred.predicted_home_score}–${pred.predicted_away_score}`}
                          {pred.is_perfect && ' · 🎯'}
                        </p>
                      ) : (
                        <p className="font-mono text-xs text-fg-3">No pick</p>
                      )}
                    </div>
                    {pred && (
                      <span className={`shrink-0 font-mono text-sm font-black ${(pts ?? 0) > 0 ? 'text-goal' : 'text-fg-3'}`}>
                        {(pts ?? 0) > 0 ? `+${pts}` : pts === 0 ? '0' : '—'}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="mb-6 rounded-2xl border border-border bg-surface-1 p-10 text-center">
            <p className="mb-3 text-fg-2">No results yet.</p>
            <Link href="/tournaments" className="text-sm font-bold text-fg-1 underline underline-offset-2">
              Make your first prediction →
            </Link>
          </div>
        )}

        {/* Manage predictions */}
        {deleteRows.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-fg-3">
              My Predictions ({deleteRows.length})
            </h2>
            <DeletePredictionsPanel predictions={deleteRows} />
          </div>
        )}

      </div>
    </main>
  )
}
