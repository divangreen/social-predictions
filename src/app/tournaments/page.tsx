import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { WC_LOCK_DATE, WC_TOURNAMENT_ID } from '@/lib/wc2026-groups'
import { computeStreak } from '@/lib/streak'
import { AnimatedHeader, AnimatedWCHero, AnimatedLeagueList, AnimatedQuickLinks } from './_components/TournamentsClient'

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

        <AnimatedHeader username={username} streak={streak} />

        <AnimatedWCHero daysLeft={daysLeft} locked={locked} tournamentId={WC_TOURNAMENT_ID} />

        <AnimatedLeagueList leagues={myLeagues ?? []} />

        <AnimatedQuickLinks tournamentId={WC_TOURNAMENT_ID} startIndex={(myLeagues?.length ?? 0) + 3} />

      </div>
    </main>
  )
}
