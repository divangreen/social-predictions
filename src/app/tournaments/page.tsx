import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { WC_LOCK_DATE, WC_TOURNAMENT_ID } from '@/lib/wc2026-groups'
import { computeStreak } from '@/lib/streak'

function daysUntilLock() {
  return Math.max(0, Math.ceil((WC_LOCK_DATE.getTime() - Date.now()) / 86_400_000))
}

export default async function TournamentsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: leagueMemberships }, { data: profile }, { data: recentPreds }] = await Promise.all([
    supabase.from('league_members').select('league_id').eq('user_id', user.id),
    supabase.from('users').select('username').eq('id', user.id).single(),
    supabase.from('predictions')
      .select('points_earned, fixtures!inner(kickoff_time, status)')
      .eq('user_id', user.id)
      .eq('fixtures.status', 'completed')
      .not('points_earned', 'is', null)
      .order('kickoff_time', { referencedTable: 'fixtures', ascending: false })
      .limit(20),
  ])

  const leagueIds = (leagueMemberships ?? []).map(m => m.league_id)
  const { data: myLeagues } = leagueIds.length
    ? await supabase.from('leagues').select('id, name, tournament_id').in('id', leagueIds)
    : { data: [] }

  const username = profile?.username ?? user.email?.split('@')[0] ?? '?'
  const daysLeft = daysUntilLock()
  const locked = daysLeft === 0

  const streak = computeStreak(
    (recentPreds ?? []).map(p => ({
      points_earned: p.points_earned,
      created_at: new Date().toISOString(),
      kickoff_time: (p.fixtures as unknown as { kickoff_time: string } | null)?.kickoff_time ?? null,
    }))
  )

  return (
    <main className="min-h-screen bg-pitch px-4 py-8">
      <div className="mx-auto max-w-lg">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black tracking-tight text-fg-1">predictr</h1>
              {streak >= 2 && (
                <span className="rounded-full bg-live/10 px-2.5 py-1 text-xs font-black text-live">
                  🔥 {streak}
                </span>
              )}
            </div>
            <p className="text-sm text-fg-3">Pick your scores. Beat your mates.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-sm font-black text-fg-1 transition hover:bg-border"
            >
              {username[0]?.toUpperCase() ?? '?'}
            </Link>
            <Link
              href="/leagues/new"
              className="rounded-xl bg-fg-1 px-4 py-2 text-sm font-bold text-pitch transition hover:opacity-90 active:scale-95"
            >
              + League
            </Link>
          </div>
        </div>

        {/* WC Hero card */}
        <Link
          href="/world-cup"
          className="mb-6 block rounded-3xl border border-white/10 bg-linear-to-br from-zinc-900 to-black p-6 transition hover:border-white/20 active:scale-[0.98]"
        >
          <div className="mb-4 flex items-start justify-between">
            <span className="text-4xl">🏆</span>
            {!locked ? (
              <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-xs font-black text-yellow-300">
                {daysLeft === 1 ? 'Last day!' : `${daysLeft} days to lock in`}
              </span>
            ) : (
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-400">
                Live
              </span>
            )}
          </div>
          <h2 className="mb-1 text-xl font-black text-white">FIFA World Cup 2026</h2>
          <p className="mb-4 text-sm text-zinc-400">48 teams · 12 groups · picks lock June 11</p>
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-xs text-zinc-500">
              <span>⚽ Group picks</span>
              <span>🏅 Knockout</span>
              <span>🌍 Champion</span>
            </div>
            <span className="text-sm font-bold text-zinc-300">Go →</span>
          </div>
        </Link>

        {/* My Leagues */}
        {(myLeagues?.length ?? 0) > 0 ? (
          <div className="mb-6">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-fg-3">My Leagues</h2>
            <div className="space-y-2">
              {myLeagues!.map(league => (
                <Link
                  key={league.id}
                  href={`/leagues/${league.id}`}
                  className="flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-5 py-3.5 transition hover:border-fg-3 active:scale-[0.98]"
                >
                  <p className="text-sm font-bold text-fg-1">{league.name}</p>
                  <span className="text-fg-3">→</span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface-1 p-6 text-center">
            <p className="mb-1 font-bold text-fg-1">No leagues yet</p>
            <p className="mb-4 text-sm text-fg-3">Create one and challenge your mates.</p>
            <Link
              href="/leagues/new"
              className="inline-block rounded-xl bg-fg-1 px-5 py-2 text-sm font-bold text-pitch transition hover:opacity-90"
            >
              Create a league
            </Link>
            <p className="mt-3 text-xs text-fg-3">
              Got an invite?{' '}
              <Link href="/join" className="text-fg-2 underline underline-offset-2 hover:text-fg-1 transition">
                Enter your code here
              </Link>
            </p>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/world-cup/bracket"
            className="rounded-2xl border border-border bg-surface-1 px-4 py-3 transition hover:border-fg-3 active:scale-[0.98]"
          >
            <p className="text-sm font-bold text-fg-1">Group picks</p>
            <p className="text-xs text-fg-3">Pick 1st & 2nd</p>
          </Link>
          <Link
            href="/world-cup/knockout"
            className="rounded-2xl border border-border bg-surface-1 px-4 py-3 transition hover:border-fg-3 active:scale-[0.98]"
          >
            <p className="text-sm font-bold text-fg-1">Knockout bracket</p>
            <p className="text-xs text-fg-3">Pick your path</p>
          </Link>
          <Link
            href={`/tournaments/${WC_TOURNAMENT_ID}`}
            className="rounded-2xl border border-border bg-surface-1 px-4 py-3 transition hover:border-fg-3 active:scale-[0.98]"
          >
            <p className="text-sm font-bold text-fg-1">Match scores</p>
            <p className="text-xs text-fg-3">Predict scorelines</p>
          </Link>
          <Link
            href="/world-cup/leaderboard"
            className="rounded-2xl border border-border bg-surface-1 px-4 py-3 transition hover:border-fg-3 active:scale-[0.98]"
          >
            <p className="text-sm font-bold text-fg-1">Leaderboard</p>
            <p className="text-xs text-fg-3">See rankings</p>
          </Link>
        </div>

      </div>
    </main>
  )
}
