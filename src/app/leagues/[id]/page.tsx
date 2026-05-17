import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { CopyInviteButton } from './_components/CopyInviteButton'

const RANK_STYLE: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-zinc-300',
  3: 'text-amber-600',
}

function Avatar({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={username} className="h-9 w-9 rounded-full object-cover" />
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold text-white">
      {username[0]?.toUpperCase()}
    </div>
  )
}

export default async function LeaguePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: league }, { data: members }] = await Promise.all([
    supabase.from('leagues').select('id, name, invite_code, tournament_id').eq('id', id).single(),
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
      supabase.from('fixtures').select('id').eq('tournament_id', tournamentId),
      memberIds.length
        ? supabase.from('predictions')
            .select('user_id, points_earned, is_perfect, fixture_id')
            .in('user_id', memberIds)
        : Promise.resolve({ data: [] }),
    ])

  const fixtureSet = new Set((tournamentFixtures ?? []).map(f => f.id))

  type LeaderboardEntry = {
    userId: string
    username: string
    avatarUrl: string | null
    points: number
    predictionsMade: number
    perfectScores: number
  }

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
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="mx-auto max-w-lg">

        <div className="mb-6">
          <Link href="/tournaments" className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300">
            ← Tournaments
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-white">{league.name}</h1>
          {tournament?.name && <p className="text-sm text-zinc-500">{tournament.name}</p>}
        </div>

        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Invite your mates</p>
          <p className="mb-3 break-all text-sm font-medium text-white">{inviteUrl}</p>
          <div className="flex gap-2">
            <CopyInviteButton text={inviteUrl} />
            <Link
              href={`/tournaments/${tournamentId}`}
              className="flex-1 rounded-xl border border-zinc-700 py-2 text-center text-sm font-medium text-zinc-300 transition hover:border-zinc-500"
            >
              Make predictions
            </Link>
          </div>
        </div>

        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Leaderboard</h2>
        <div className="space-y-2">
          {leaderboard.map((entry, i) => {
            const rank = i + 1
            const isMe = entry.userId === user.id
            return (
              <div
                key={entry.userId}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                  isMe ? 'border-white/20 bg-white/5' : 'border-zinc-800 bg-zinc-900'
                }`}
              >
                <span className={`w-6 text-center text-sm font-black ${RANK_STYLE[rank] ?? 'text-zinc-500'}`}>
                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                </span>
                <Avatar username={entry.username} avatarUrl={entry.avatarUrl} />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {entry.username} {isMe && <span className="text-xs text-zinc-500">(you)</span>}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {entry.predictionsMade} picks
                    {entry.perfectScores > 0 && ` · 🎯 ${entry.perfectScores} perfect`}
                  </p>
                </div>
                <span className="text-lg font-black text-white">{entry.points}</span>
              </div>
            )
          })}

          {leaderboard.length === 0 && (
            <div className="rounded-2xl border border-zinc-800 p-8 text-center">
              <p className="text-zinc-400">No members yet. Share the invite link!</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
