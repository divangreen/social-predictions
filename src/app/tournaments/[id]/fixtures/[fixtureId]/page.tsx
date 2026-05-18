import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchMatchDetails } from '@/lib/match-details'
import { MatchTabs } from './_components/MatchTabs'

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
    supabase.from('predictions').select('*').eq('fixture_id', fixtureId).eq('user_id', user.id).maybeSingle(),
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

  const userMap = Object.fromEntries((peerUsers ?? []).map(u => [u.id, u.username]))

  const isCompleted = fixture.status === 'completed' && fixture.home_score != null
  const isLive = fixture.status === 'live'

  const kickoff = new Date(fixture.kickoff_time)
  const kickoffStr =
    kickoff.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' · ' +
    kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  return (
    <main className="min-h-screen bg-pitch px-4 py-8">
      <div className="mx-auto max-w-lg">

        <Link href={`/tournaments/${tournamentId}`} className="mb-5 inline-flex items-center gap-1 text-sm text-fg-3 transition hover:text-fg-2">
          ← Back
        </Link>

        {/* Score card */}
        <div className={`mb-4 rounded-2xl border bg-surface-1 p-5 ${isCompleted ? 'border-border' : isLive ? 'border-live/30' : 'border-border'}`}>
          {/* Status bar */}
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
              <span className="font-mono text-xs text-fg-3">{kickoffStr}</span>
            )}
          </div>

          {/* Teams + score */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-1 flex-col items-center gap-2">
              {fixture.home_team_logo && (
                <img src={fixture.home_team_logo} alt={fixture.home_team_name} className="h-16 w-16 object-contain" />
              )}
              <span className="text-center text-sm font-bold text-fg-1 leading-tight">{fixture.home_team_name}</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              {isCompleted || isLive ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-4xl font-black ${isLive ? 'text-live' : 'text-fg-1'}`}>{fixture.home_score ?? 0}</span>
                    <span className="text-fg-3">–</span>
                    <span className={`font-mono text-4xl font-black ${isLive ? 'text-live' : 'text-fg-1'}`}>{fixture.away_score ?? 0}</span>
                  </div>
                  {matchDetails.halfTimeHome !== null && matchDetails.halfTimeAway !== null && (
                    <span className="font-mono text-xs text-fg-3">HT {matchDetails.halfTimeHome}–{matchDetails.halfTimeAway}</span>
                  )}
                </>
              ) : (
                <>
                  <span className="font-mono text-2xl font-black text-fg-3">vs</span>
                  <span className="font-mono text-xs text-fg-3">{kickoffStr}</span>
                </>
              )}
            </div>

            <div className="flex flex-1 flex-col items-center gap-2">
              {fixture.away_team_logo && (
                <img src={fixture.away_team_logo} alt={fixture.away_team_name} className="h-16 w-16 object-contain" />
              )}
              <span className="text-center text-sm font-bold text-fg-1 leading-tight">{fixture.away_team_name}</span>
            </div>
          </div>
        </div>

        {/* Tabbed content */}
        <MatchTabs
          fixture={fixture}
          details={matchDetails}
          myPrediction={myPrediction ?? null}
          peerPredictions={peerPredictions ?? []}
          userMap={userMap}
          allPreds={allPredictions ?? []}
        />

      </div>
    </main>
  )
}
