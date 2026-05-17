import { createClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import ScoreForm from './_components/ScoreForm'

const STATUS_BADGE: Record<string, string> = {
  scheduled: 'text-zinc-400 bg-zinc-800',
  live: 'text-green-400 bg-green-400/10',
  completed: 'text-blue-400 bg-blue-400/10',
}

export default async function AdminFixturesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.id)) redirect('/')

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name')
    .order('name')

  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('*')
    .order('kickoff_time')

  const fixturesByTournament = new Map<string, typeof fixtures>()
  ;(fixtures ?? []).forEach(f => {
    if (!fixturesByTournament.has(f.tournament_id)) fixturesByTournament.set(f.tournament_id, [])
    fixturesByTournament.get(f.tournament_id)!.push(f)
  })

  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white">Admin — Results</h1>
          <p className="text-sm text-zinc-500">Enter final scores to unlock points and leaderboards.</p>
        </div>

        <div className="space-y-8">
          {(tournaments ?? []).map(t => {
            const tFixtures = fixturesByTournament.get(t.id) ?? []
            return (
              <div key={t.id}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">{t.name}</h2>
                <div className="space-y-2">
                  {tFixtures.length === 0 && (
                    <p className="text-sm text-zinc-600">No fixtures.</p>
                  )}
                  {tFixtures.map(f => (
                    <div key={f.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {f.home_team_name} vs {f.away_team_name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {f.stage} · {new Date(f.kickoff_time).toLocaleString('en-GB', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[f.status ?? 'scheduled']}`}>
                          {f.status ?? 'scheduled'}
                        </span>
                      </div>
                      <ScoreForm fixture={f} />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
