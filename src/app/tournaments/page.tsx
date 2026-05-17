import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const SPORT_EMOJI: Record<string, string> = {
  football: '⚽',
  basketball: '🏀',
  rugby: '🏉',
  cricket: '🏏',
  tennis: '🎾',
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  upcoming: { label: 'Upcoming', color: 'text-zinc-400 bg-zinc-800' },
  active: { label: 'Live', color: 'text-green-400 bg-green-400/10' },
  completed: { label: 'Ended', color: 'text-zinc-500 bg-zinc-800' },
}

export default async function TournamentsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: tournaments }, { data: myLeagues }] = await Promise.all([
    supabase.from('tournaments').select('*').order('status', { ascending: true }),
    supabase
      .from('league_members')
      .select('leagues(id, name, tournament_id, tournaments(name))')
      .eq('user_id', user.id),
  ])

  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="mb-1 text-3xl font-black tracking-tight text-white">predictr</h1>
            <p className="text-sm text-zinc-500">Pick your scores. Beat your mates.</p>
          </div>
          <Link
            href="/leagues/new"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            + League
          </Link>
        </div>

        {!tournaments?.length ? (
          <div className="rounded-2xl border border-zinc-800 p-8 text-center">
            <p className="text-zinc-400">No tournaments yet. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tournaments.map(t => {
              const emoji = SPORT_EMOJI[t.sport?.toLowerCase()] ?? '🏆'
              const status = STATUS_LABEL[t.status ?? 'upcoming']
              return (
                <Link
                  key={t.id}
                  href={`/tournaments/${t.id}`}
                  className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 transition hover:border-zinc-600 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{emoji}</span>
                    <div>
                      <p className="font-semibold text-white">{t.name}</p>
                      <p className="text-xs capitalize text-zinc-500">{t.sport}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
        {/* My Leagues */}
        {(myLeagues?.length ?? 0) > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">My leagues</h2>
            <div className="space-y-2">
              {myLeagues!.map(m => {
                const league = m.leagues as { id: string; name: string; tournament_id: string; tournaments: { name: string } | null } | null
                if (!league) return null
                return (
                  <Link
                    key={league.id}
                    href={`/leagues/${league.id}`}
                    className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-3.5 transition hover:border-zinc-600"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{league.name}</p>
                      <p className="text-xs text-zinc-500">{league.tournaments?.name}</p>
                    </div>
                    <span className="text-zinc-500">→</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
