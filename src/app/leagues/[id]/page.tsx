import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { CopyInviteButton } from './_components/CopyInviteButton'
import { PredictionFeed, type FeedItem } from './_components/PredictionFeed'
import { AdminPanel } from './_components/AdminPanel'
import { RealtimeLeaderboard, type LeaderboardEntry } from './_components/RealtimeLeaderboard'
import { LeagueTabs } from './_components/LeagueTabs'

const FEED_EMOJIS = ['🔥', '💀', '😂', '🎯'] as const

export default async function LeaguePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: league }, { data: members }] = await Promise.all([
    supabase.from('leagues').select('id, name, invite_code, tournament_id, created_by').eq('id', id).single(),
    supabase.from('league_members').select('user_id').eq('league_id', id),
  ])

  if (!league) notFound()

  const memberIds = (members ?? []).map(m => m.user_id)
  const tournamentId = league.tournament_id

  const [{ data: tournament }, { data: memberUsers }, { data: tournamentFixtures }, { data: predictions }] =
    await Promise.all([
      supabase.from('tournaments').select('name').eq('id', tournamentId).single(),
      memberIds.length
        ? supabase.from('users').select('id, username, avatar_url').in('id', memberIds)
        : Promise.resolve({ data: [] }),
      supabase.from('fixtures').select('id, home_team_name, away_team_name, ai_banter').eq('tournament_id', tournamentId),
      memberIds.length
        ? supabase.from('predictions')
            .select('id, user_id, fixture_id, prediction_type, predicted_home_score, predicted_away_score, predicted_result, points_earned, is_perfect, created_at')
            .in('user_id', memberIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
    ])

  const fixtureSet = new Set((tournamentFixtures ?? []).map(f => f.id))
  const fixtureMap = new Map((tournamentFixtures ?? []).map(f => [f.id, f]))
  const seenFixtures = new Set<string>()

  const statsMap = new Map<string, { points: number; made: number; perfect: number }>()
  ;(predictions ?? [])
    .filter(p => fixtureSet.has(p.fixture_id))
    .forEach(p => {
      const s = statsMap.get(p.user_id) ?? { points: 0, made: 0, perfect: 0 }
      s.points += p.points_earned ?? 0
      s.made += 1
      if (p.is_perfect) s.perfect += 1
      statsMap.set(p.user_id, s)
    })

  const userMap = new Map((memberUsers ?? []).map(u => [u.id, u]))

  const feedPredictions = (predictions ?? [])
    .filter(p => fixtureSet.has(p.fixture_id))
    .slice(0, 20)

  const feedPredictionIds = feedPredictions.map(p => p.id)
  let reactionsData: { prediction_id: string; user_id: string; emoji: string }[] = []
  if (feedPredictionIds.length) {
    const { data } = await supabase.from('reactions').select('prediction_id, user_id, emoji').in('prediction_id', feedPredictionIds)
    reactionsData = data ?? []
  }

  const feedItems: FeedItem[] = feedPredictions.map(p => {
    const fixture = fixtureMap.get(p.fixture_id)
    const u = userMap.get(p.user_id)
    const predReactions = reactionsData.filter(r => r.prediction_id === p.id)
    const isFirstForFixture = !seenFixtures.has(p.fixture_id)
    if (isFirstForFixture) seenFixtures.add(p.fixture_id)
    return {
      id: p.id,
      userId: p.user_id,
      username: u?.username ?? 'Unknown',
      homeTeam: fixture?.home_team_name ?? '?',
      awayTeam: fixture?.away_team_name ?? '?',
      predictionType: (p.prediction_type ?? 'score') as 'score' | 'result',
      predictedHome: p.predicted_home_score,
      predictedAway: p.predicted_away_score,
      predictedResult: (p.predicted_result ?? null) as 'home' | 'draw' | 'away' | null,
      createdAt: p.created_at,
      banter: isFirstForFixture ? (fixture?.ai_banter ?? null) : null,
      reactions: FEED_EMOJIS.map(e => ({
        emoji: e,
        count: predReactions.filter(r => r.emoji === e).length,
        byMe: predReactions.some(r => r.emoji === e && r.user_id === user.id),
      })),
    }
  })

  const leaderboard: LeaderboardEntry[] = memberIds
    .map(uid => {
      const u = userMap.get(uid)
      const stats = statsMap.get(uid) ?? { points: 0, made: 0, perfect: 0 }
      return {
        userId: uid,
        username: u?.username ?? 'Unknown',
        avatarUrl: u?.avatar_url ?? null,
        points: stats.points,
        predictionsMade: stats.made,
        perfectScores: stats.perfect,
      }
    })
    .sort((a, b) => b.points - a.points)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const inviteUrl = `${siteUrl}/join/${league.invite_code}`

  return (
    <main className="min-h-screen bg-pitch px-4 py-8">
      <div className="mx-auto max-w-lg">

        <div className="mb-6">
          <Link href="/tournaments" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-3 transition hover:text-fg-2">
            ← Tournaments
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-fg-1">{league.name}</h1>
            {league.created_by === user.id && (
              <AdminPanel
                leagueId={id}
                leagueName={league.name}
                members={leaderboard.map(e => ({ userId: e.userId, username: e.username }))}
                currentUserId={user.id}
              />
            )}
          </div>
          {tournament?.name && <p className="text-sm text-fg-3">{tournament.name}</p>}
        </div>

        {/* Invite card */}
        <div className="mb-6 rounded-2xl border border-border bg-surface-1 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-fg-3">Invite your mates</p>
          <p className="mb-0.5 font-mono text-3xl font-black tracking-[0.2em] text-fg-1">{league.invite_code}</p>
          <p className="mb-3 font-mono text-xs text-fg-3 break-all">{inviteUrl}</p>
          <div className="flex gap-2">
            <CopyInviteButton text={inviteUrl} />
            <Link
              href={`/tournaments/${tournamentId}`}
              className="flex-1 rounded-xl border border-border py-2 text-center text-sm font-bold text-fg-2 transition hover:border-fg-3 hover:text-fg-1"
            >
              Make predictions
            </Link>
          </div>
        </div>

        {/* Leaderboard + Feed tabs */}
        <LeagueTabs
          feedCount={feedItems.length}
          leaderboard={
            <RealtimeLeaderboard
              initial={leaderboard}
              currentUserId={user.id}
              memberIds={memberIds}
              tournamentId={tournamentId}
            />
          }
          feed={
            <PredictionFeed initial={feedItems} currentUserId={user.id} leagueId={id} />
          }
        />

      </div>
    </main>
  )
}
