import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchMatchDetails } from '@/lib/match-details'

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

  const leagueIds = (leagueMemberships ?? []).map(m => m.league_id)
  const { data: leagueMembers } = leagueIds.length
    ? await supabase.from('league_members').select('user_id').in('league_id', leagueIds)
    : { data: [] }

  const peerIds = [...new Set((leagueMembers ?? []).map(m => m.user_id).filter(uid => uid !== user.id))]

  const [{ data: peerPredictions }, { data: peerUsers }, { data: allPredictions }, matchDetails] = await Promise.all([
    peerIds.length
      ? supabase.from('predictions').select('*').eq('fixture_id', fixtureId).in('user_id', peerIds)
      : Promise.resolve({ data: [] }),
    peerIds.length
      ? supabase.from('users').select('id, username').in('id', peerIds)
      : Promise.resolve({ data: [] }),
    supabase.from('predictions').select('predicted_home_score, predicted_away_score').eq('fixture_id', fixtureId),
    fetchMatchDetails(fixtureId),
  ])

  const userMap = new Map((peerUsers ?? []).map(u => [u.id, u.username]))

  const kickoff = new Date(fixture.kickoff_time)
  const kickoffDate = kickoff.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const kickoffTime = kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const isCompleted = fixture.status === 'completed' && fixture.home_score != null
  const isLive = fixture.status === 'live'
  const myPts = myPrediction?.points_earned ?? 0

  const allPreds = allPredictions ?? []
  const total = allPreds.length
  const homeWins = allPreds.filter(p => p.predicted_home_score > p.predicted_away_score).length
  const draws = allPreds.filter(p => p.predicted_home_score === p.predicted_away_score).length
  const awayWins = allPreds.filter(p => p.predicted_home_score < p.predicted_away_score).length
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0

  return (
    <main className="min-h-screen bg-pitch px-4 py-8">
      <div className="mx-auto max-w-lg space-y-4">

        <Link href={`/tournaments/${tournamentId}`} className="inline-flex items-center gap-1 text-sm text-fg-3 transition hover:text-fg-2">
          ← Back
        </Link>

        {/* Match header */}
        <div className={`rounded-2xl border bg-surface-1 p-5 ${isCompleted && myPts > 0 ? 'border-goal/25' : isLive ? 'border-live/30' : 'border-border'}`}>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-fg-3">{fixture.stage}</span>
            {isLive ? (
              <span className="flex items-center gap-1.5 rounded-full bg-live/10 px-2.5 py-1 text-xs font-bold text-live">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
                LIVE
              </span>
            ) : isCompleted ? (
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold text-fg-3">Full Time</span>
            ) : (
              <span className="font-mono text-xs text-fg-3">{kickoffDate} · {kickoffTime}</span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-1 flex-col items-center gap-2">
              {fixture.home_team_logo && <img src={fixture.home_team_logo} alt={fixture.home_team_name} className="h-14 w-14 object-contain" />}
              <span className="text-center text-sm font-bold text-fg-1 leading-tight">{fixture.home_team_name}</span>
              {fixture.is_underdog_home && <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold">underdog</span>}
            </div>

            <div className="flex flex-col items-center gap-1">
              {isCompleted || isLive ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-4xl font-black ${isLive ? 'text-live' : 'text-fg-1'}`}>{fixture.home_score ?? 0}</span>
                    <span className="text-fg-3">–</span>
                    <span className={`font-mono text-4xl font-black ${isLive ? 'text-live' : 'text-fg-1'}`}>{fixture.away_score ?? 0}</span>
                  </div>
                  {isLive && <span className="font-mono text-[10px] text-fg-3">{kickoffDate}</span>}
                </>
              ) : (
                <span className="font-mono text-2xl font-black text-fg-3">vs</span>
              )}
            </div>

            <div className="flex flex-1 flex-col items-center gap-2">
              {fixture.away_team_logo && <img src={fixture.away_team_logo} alt={fixture.away_team_name} className="h-14 w-14 object-contain" />}
              <span className="text-center text-sm font-bold text-fg-1 leading-tight">{fixture.away_team_name}</span>
              {fixture.is_underdog_away && <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold">underdog</span>}
            </div>
          </div>

          {/* Goalscorers */}
          {(matchDetails.homeGoalscorers.length > 0 || matchDetails.awayGoalscorers.length > 0) && (
            <div className="mt-4 flex justify-between gap-4 border-t border-border pt-3">
              <div className="flex-1 space-y-0.5">
                {matchDetails.homeGoalscorers.map((g, i) => (
                  <p key={i} className="text-xs text-fg-2">⚽ {g.name} <span className="text-fg-3">{g.minute}&apos;</span></p>
                ))}
              </div>
              <div className="flex-1 space-y-0.5 text-right">
                {matchDetails.awayGoalscorers.map((g, i) => (
                  <p key={i} className="text-xs text-fg-2"><span className="text-fg-3">{g.minute}&apos;</span> {g.name} ⚽</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Match info */}
        {(matchDetails.venue || matchDetails.referee || matchDetails.attendance || matchDetails.homeFormation) && (
          <div className="rounded-2xl border border-border bg-surface-1 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-fg-3">Match Info</p>
            <div className="grid grid-cols-2 gap-3">
              {matchDetails.venue && (
                <div className="flex items-start gap-2">
                  <span className="text-base">🏟️</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-fg-3">Stadium</p>
                    <p className="text-sm font-bold text-fg-1">{matchDetails.venue}</p>
                  </div>
                </div>
              )}
              {matchDetails.referee && (
                <div className="flex items-start gap-2">
                  <span className="text-base">🟨</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-fg-3">Referee</p>
                    <p className="text-sm font-bold text-fg-1">{matchDetails.referee}</p>
                  </div>
                </div>
              )}
              {matchDetails.attendance && (
                <div className="flex items-start gap-2">
                  <span className="text-base">👥</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-fg-3">Attendance</p>
                    <p className="text-sm font-bold text-fg-1">{matchDetails.attendance.toLocaleString()}</p>
                  </div>
                </div>
              )}
              {matchDetails.homeFormation && matchDetails.awayFormation && (
                <div className="flex items-start gap-2">
                  <span className="text-base">📋</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-fg-3">Formations</p>
                    <p className="text-sm font-bold text-fg-1">{matchDetails.homeFormation} / {matchDetails.awayFormation}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Match stats */}
        {matchDetails.stats.length > 0 && (
          <div className="rounded-2xl border border-border bg-surface-1 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-fg-3">Match Stats</p>
            <div className="space-y-3">
              {matchDetails.stats.map(stat => {
                const h = Number(stat.home)
                const a = Number(stat.away)
                const sum = h + a
                const homePct = sum > 0 ? (h / sum) * 100 : 50
                return (
                  <div key={stat.label}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-mono text-sm font-black text-fg-1">{stat.home}</span>
                      <span className="text-xs font-bold text-fg-3">{stat.label}</span>
                      <span className="font-mono text-sm font-black text-fg-1">{stat.away}</span>
                    </div>
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className="bg-info rounded-l-full transition-all" style={{ width: `${homePct}%` }} />
                      <div className="bg-gold rounded-r-full transition-all" style={{ width: `${100 - homePct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* My prediction result */}
        {myPrediction && isCompleted && (
          <div className={`rounded-2xl border p-4 ${myPts > 0 ? 'border-goal/25 bg-goal/5' : 'border-border bg-surface-1'}`}>
            <div className="flex items-center justify-between">
              <div>
                {myPrediction.is_perfect ? (
                  <p className="font-black text-goal">🎯 Perfect score!</p>
                ) : myPts > 0 ? (
                  <p className="font-black text-goal">✅ Correct result</p>
                ) : (
                  <p className="font-bold text-fg-3">✗ Missed</p>
                )}
                <p className="mt-0.5 font-mono text-xs text-fg-3">My pick: {myPrediction.predicted_home_score}–{myPrediction.predicted_away_score}</p>
              </div>
              <span className="font-mono text-2xl font-black text-gold">+{myPts}</span>
            </div>
          </div>
        )}

        {myPrediction && !isCompleted && (
          <div className="rounded-2xl border border-border bg-surface-1 p-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-fg-3">My prediction</p>
            <p className="font-mono text-xl font-black text-fg-1">{myPrediction.predicted_home_score} – {myPrediction.predicted_away_score}</p>
          </div>
        )}

        {/* Community prediction distribution */}
        {total > 0 && (
          <div className="rounded-2xl border border-border bg-surface-1 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-fg-3">
              Community picks · {total} {total === 1 ? 'pick' : 'picks'}
            </p>
            <div className="space-y-2.5">
              {[
                { label: fixture.home_team_name, count: homeWins, p: pct(homeWins), color: 'bg-info' },
                { label: 'Draw', count: draws, p: pct(draws), color: 'bg-fg-3' },
                { label: fixture.away_team_name, count: awayWins, p: pct(awayWins), color: 'bg-gold' },
              ].map(row => (
                <div key={row.label}>
                  <div className="mb-1 flex justify-between">
                    <span className="max-w-[60%] truncate text-xs font-bold text-fg-2">{row.label}</span>
                    <span className="font-mono text-xs text-fg-3">{row.p}% ({row.count})</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.p}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* League picks */}
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
                      <span className="font-mono text-sm font-black text-fg-1">{pred.predicted_home_score}–{pred.predicted_away_score}</span>
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
