import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

export default async function FixturePage({
  params,
}: {
  params: Promise<{ id: string; fixtureId: string }>
}) {
  const { id: tournamentId, fixtureId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: fixture }, { data: myPrediction }, { data: leagueMemberships }] = await Promise.all([
    supabase.from('fixtures').select('*').eq('id', fixtureId).single(),
    supabase.from('predictions').select('*').eq('fixture_id', fixtureId).eq('user_id', user.id).single(),
    supabase.from('league_members').select('league_id').eq('user_id', user.id),
  ])

  if (!fixture) notFound()

  // Get all league members the user shares a league with for this tournament
  const leagueIds = (leagueMemberships ?? []).map(m => m.league_id)
  const { data: leagueMembers } = leagueIds.length
    ? await supabase
        .from('league_members')
        .select('user_id, league_id')
        .in('league_id', leagueIds)
    : { data: [] }

  const peerIds = [...new Set(
    (leagueMembers ?? [])
      .map(m => m.user_id)
      .filter(uid => uid !== user.id)
  )]

  const [{ data: peerPredictions }, { data: peerUsers }, { data: allPredictions }] = await Promise.all([
    peerIds.length
      ? supabase.from('predictions').select('*').eq('fixture_id', fixtureId).in('user_id', peerIds)
      : Promise.resolve({ data: [] }),
    peerIds.length
      ? supabase.from('users').select('id, username').in('id', peerIds)
      : Promise.resolve({ data: [] }),
    // All predictions for this fixture (for distribution stats)
    supabase.from('predictions').select('predicted_home_score, predicted_away_score').eq('fixture_id', fixtureId),
  ])

  const userMap = new Map((peerUsers ?? []).map(u => [u.id, u.username]))

  const kickoff = new Date(fixture.kickoff_time)
  const kickoffLabel =
    kickoff.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
    ' · ' +
    kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const isCompleted = fixture.status === 'completed' && fixture.home_score != null
  const isLive = fixture.status === 'live'
  const myPts = myPrediction?.points_earned ?? 0

  // Prediction distribution
  const allPreds = allPredictions ?? []
  const total = allPreds.length
  const homeWins = allPreds.filter(p => p.predicted_home_score > p.predicted_away_score).length
  const draws = allPreds.filter(p => p.predicted_home_score === p.predicted_away_score).length
  const awayWins = allPreds.filter(p => p.predicted_home_score < p.predicted_away_score).length

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0

  return (
    <main className="min-h-screen bg-pitch px-4 py-8">
      <div className="mx-auto max-w-lg">

        {/* Back */}
        <Link
          href={`/tournaments/${tournamentId}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-fg-3 transition hover:text-fg-2"
        >
          ← Back
        </Link>

        {/* Match header card */}
        <div className={`mb-4 rounded-2xl border bg-surface-1 p-5 ${isCompleted && myPts > 0 ? 'border-goal/25' : isLive ? 'border-live/30' : 'border-border'}`}>

          {/* Stage + status */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-fg-3">{fixture.stage}</span>
            {isLive ? (
              <span className="flex items-center gap-1.5 rounded-full bg-live/10 px-2.5 py-1 text-xs font-bold text-live">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
                LIVE
              </span>
            ) : (
              <span className="font-mono text-xs text-fg-3">{kickoffLabel}</span>
            )}
          </div>

          {/* Teams */}
          <div className="flex items-center justify-between gap-3">
            {/* Home */}
            <div className="flex flex-1 flex-col items-center gap-2">
              {fixture.home_team_logo && (
                <img src={fixture.home_team_logo} alt={fixture.home_team_name} className="h-14 w-14 object-contain" />
              )}
              <span className="text-center text-sm font-bold text-fg-1 leading-tight">{fixture.home_team_name}</span>
              {fixture.is_underdog_home && (
                <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold">underdog</span>
              )}
            </div>

            {/* Score or VS */}
            <div className="flex flex-col items-center gap-1">
              {isCompleted ? (
                <div className="flex items-center gap-3">
                  <span className="font-mono text-4xl font-black text-fg-1">{fixture.home_score}</span>
                  <span className="text-fg-3">–</span>
                  <span className="font-mono text-4xl font-black text-fg-1">{fixture.away_score}</span>
                </div>
              ) : isLive ? (
                <div className="flex items-center gap-3">
                  <span className="font-mono text-4xl font-black text-live">{fixture.home_score ?? 0}</span>
                  <span className="text-fg-3">–</span>
                  <span className="font-mono text-4xl font-black text-live">{fixture.away_score ?? 0}</span>
                </div>
              ) : (
                <span className="font-mono text-2xl font-black text-fg-3">vs</span>
              )}
              {isLive && <span className="font-mono text-xs text-fg-3">{kickoffLabel}</span>}
            </div>

            {/* Away */}
            <div className="flex flex-1 flex-col items-center gap-2">
              {fixture.away_team_logo && (
                <img src={fixture.away_team_logo} alt={fixture.away_team_name} className="h-14 w-14 object-contain" />
              )}
              <span className="text-center text-sm font-bold text-fg-1 leading-tight">{fixture.away_team_name}</span>
              {fixture.is_underdog_away && (
                <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold">underdog</span>
              )}
            </div>
          </div>
        </div>

        {/* My prediction result */}
        {myPrediction && isCompleted && (
          <div className={`mb-4 rounded-2xl border p-4 ${myPts > 0 ? 'border-goal/25 bg-goal/5' : 'border-border bg-surface-1'}`}>
            <div className="flex items-center justify-between">
              <div>
                {myPrediction.is_perfect ? (
                  <p className="font-black text-goal">🎯 Perfect score!</p>
                ) : myPts > 0 ? (
                  <p className="font-black text-goal">✅ Correct result</p>
                ) : (
                  <p className="font-bold text-fg-3">✗ Missed</p>
                )}
                <p className="font-mono text-xs text-fg-3 mt-0.5">
                  My pick: {myPrediction.predicted_home_score}–{myPrediction.predicted_away_score}
                </p>
              </div>
              <span className="font-mono text-2xl font-black text-gold">+{myPts}</span>
            </div>
          </div>
        )}

        {/* My prediction (pre-match) */}
        {myPrediction && !isCompleted && (
          <div className="mb-4 rounded-2xl border border-border bg-surface-1 p-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-fg-3">My prediction</p>
            <p className="font-mono text-xl font-black text-fg-1">
              {myPrediction.predicted_home_score} – {myPrediction.predicted_away_score}
            </p>
          </div>
        )}

        {/* Prediction distribution */}
        {total > 0 && (
          <div className="mb-4 rounded-2xl border border-border bg-surface-1 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-fg-3">
              Community predictions · {total} {total === 1 ? 'pick' : 'picks'}
            </p>
            <div className="space-y-2.5">
              {[
                { label: fixture.home_team_name, count: homeWins, pct: pct(homeWins), color: 'bg-info' },
                { label: 'Draw', count: draws, pct: pct(draws), color: 'bg-fg-3' },
                { label: fixture.away_team_name, count: awayWins, pct: pct(awayWins), color: 'bg-gold' },
              ].map(row => (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-bold text-fg-2 truncate max-w-[60%]">{row.label}</span>
                    <span className="font-mono text-xs text-fg-3">{row.pct}% ({row.count})</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={`h-full rounded-full ${row.color} transition-all`}
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* League friends' picks */}
        {(peerPredictions?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-border bg-surface-1 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-fg-3">League picks</p>
            <div className="space-y-2">
              {peerPredictions!.map(pred => {
                const username = userMap.get(pred.user_id) ?? 'Unknown'
                const pts = pred.points_earned
                return (
                  <div key={pred.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-border text-xs font-bold text-fg-1">
                        {username[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-bold text-fg-1">{username}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-black text-fg-1">
                        {pred.predicted_home_score}–{pred.predicted_away_score}
                      </span>
                      {pts !== null && (
                        <span className={`font-mono text-sm font-black ${pts > 0 ? 'text-goal' : 'text-fg-3'}`}>
                          {pts > 0 ? `+${pts}` : '—'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
