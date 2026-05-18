import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogoutButton } from './_components/LogoutButton'

const SPORT_EMOJI: Record<string, string> = {
  football: '⚽',
  basketball: '🏀',
  rugby: '🏉',
  cricket: '🏏',
  tennis: '🎾',
}

export default async function TournamentsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: tournaments }, { data: leagueMemberships }] = await Promise.all([
    supabase.from('tournaments').select('*').order('status', { ascending: true }),
    supabase.from('league_members').select('league_id').eq('user_id', user.id),
  ])

  const leagueIds = (leagueMemberships ?? []).map(m => m.league_id)

  const { data: myLeagues } = leagueIds.length
    ? await supabase.from('leagues').select('id, name, tournament_id').in('id', leagueIds)
    : { data: [] }

  const tournamentIds = [...new Set((myLeagues ?? []).map(l => l.tournament_id))]
  const { data: leagueTournaments } = tournamentIds.length
    ? await supabase.from('tournaments').select('id, name').in('id', tournamentIds)
    : { data: [] }
  const tournamentNameMap = new Map((leagueTournaments ?? []).map(t => [t.id, t.name]))

  const live = (tournaments ?? []).filter(t => t.status === 'active')
  const upcoming = (tournaments ?? []).filter(t => t.status === 'upcoming')
  const ended = (tournaments ?? []).filter(t => t.status === 'completed')

  return (
    <main className="min-h-screen bg-pitch px-4 py-8">
      <div className="mx-auto max-w-lg">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-fg-1">predictr</h1>
            <p className="text-sm text-fg-3">Pick your scores. Beat your mates.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-sm font-black text-fg-1 transition hover:bg-border"
            >
              {(user.email?.[0] ?? '?').toUpperCase()}
            </Link>
            <LogoutButton />
            <Link
              href="/leagues/new"
              className="rounded-xl bg-fg-1 px-4 py-2 text-sm font-bold text-pitch transition hover:opacity-90 active:scale-95"
            >
              + League
            </Link>
          </div>
        </div>

        {!tournaments?.length ? (
          <div className="rounded-2xl border border-border bg-surface-1 p-10 text-center">
            <p className="text-fg-2">No tournaments yet. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-8">

            {/* Live */}
            {live.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-live" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-live">Live Now</h2>
                </div>
                <div className="space-y-2">
                  {live.map(t => (
                    <TournamentCard key={t.id} t={t} accent="live" />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-fg-3">Upcoming</h2>
                <div className="space-y-2">
                  {upcoming.map(t => (
                    <TournamentCard key={t.id} t={t} accent="default" />
                  ))}
                </div>
              </section>
            )}

            {/* Ended */}
            {ended.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-fg-3">Ended</h2>
                <div className="space-y-2">
                  {ended.map(t => (
                    <TournamentCard key={t.id} t={t} accent="muted" />
                  ))}
                </div>
              </section>
            )}

          </div>
        )}

        {/* My Leagues */}
        {(myLeagues?.length ?? 0) > 0 && (
          <div className="mt-10">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-fg-3">My Leagues</h2>
            <div className="space-y-2">
              {myLeagues!.map(league => (
                <Link
                  key={league.id}
                  href={`/leagues/${league.id}`}
                  className="flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-5 py-3.5 transition hover:border-fg-3 active:scale-[0.98]"
                >
                  <div>
                    <p className="text-sm font-bold text-fg-1">{league.name}</p>
                    <p className="text-xs text-fg-3">{tournamentNameMap.get(league.tournament_id)}</p>
                  </div>
                  <span className="text-fg-3">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}

function TournamentCard({
  t,
  accent,
}: {
  t: { id: string; name: string; sport: string | null; status: string | null }
  accent: 'live' | 'default' | 'muted'
}) {
  const emoji = SPORT_EMOJI[t.sport?.toLowerCase() ?? ''] ?? '🏆'
  const borderClass = accent === 'live' ? 'border-live/30' : 'border-border'
  const badgeClass =
    accent === 'live'
      ? 'bg-live/10 text-live'
      : accent === 'muted'
        ? 'bg-surface-2 text-fg-3'
        : 'bg-surface-2 text-fg-2'
  const badgeLabel = accent === 'live' ? 'Live' : accent === 'muted' ? 'Ended' : 'Upcoming'

  return (
    <Link
      href={`/tournaments/${t.id}`}
      className={`flex items-center justify-between rounded-2xl border ${borderClass} bg-surface-1 px-5 py-4 transition hover:border-fg-3 active:scale-[0.98]`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <div>
          <p className="font-bold text-fg-1">{t.name}</p>
          <p className="text-xs capitalize text-fg-3">{t.sport}</p>
        </div>
      </div>
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badgeClass}`}>
        {badgeLabel}
      </span>
    </Link>
  )
}
