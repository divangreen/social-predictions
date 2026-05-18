import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: predictions }, { data: leagues }] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('predictions').select('*').eq('user_id', user.id),
    supabase.from('league_members').select('league_id').eq('user_id', user.id),
  ])

  const allPredictions = predictions ?? []
  const scored = allPredictions.filter(p => p.points_earned !== null)
  const totalPoints = scored.reduce((sum, p) => sum + (p.points_earned ?? 0), 0)
  const perfectScores = scored.filter(p => p.is_perfect).length
  const correct = scored.filter(p => (p.points_earned ?? 0) > 0).length
  const accuracy = scored.length > 0 ? Math.round((correct / scored.length) * 100) : 0
  const leagueCount = leagues?.length ?? 0

  const recent = [...allPredictions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20)

  const fixtureIds = recent.map(p => p.fixture_id)
  const { data: fixtures } = fixtureIds.length
    ? await supabase.from('fixtures').select('id, home_team_name, away_team_name, home_score, away_score, kickoff_time').in('id', fixtureIds)
    : { data: [] }

  const fixtureMap = new Map((fixtures ?? []).map(f => [f.id, f]))

  const username = profile?.username ?? user.email?.split('@')[0] ?? 'User'

  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="mx-auto max-w-lg">

        <div className="mb-6">
          <Link href="/tournaments" className="text-sm text-zinc-500 hover:text-zinc-300">
            ← Tournaments
          </Link>
        </div>

        {/* Profile card */}
        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-2xl font-black text-white">
              {username[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black text-white">{username}</h1>
              <p className="truncate text-sm text-zinc-500">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {([
              { label: 'Points', value: String(totalPoints) },
              { label: 'Accuracy', value: `${accuracy}%` },
              { label: 'Picks', value: String(allPredictions.length) },
              { label: 'Leagues', value: String(leagueCount) },
            ] as const).map(stat => (
              <div key={stat.label} className="rounded-xl bg-zinc-800 p-3 text-center">
                <p className="text-xl font-black text-white">{stat.value}</p>
                <p className="mt-0.5 text-[10px] text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {perfectScores > 0 && (
            <p className="mt-4 text-center text-sm text-zinc-400">
              🎯 {perfectScores} perfect {perfectScores === 1 ? 'score' : 'scores'}
            </p>
          )}
        </div>

        {/* Recent predictions */}
        {recent.length > 0 ? (
          <>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Recent picks</h2>
            <div className="space-y-2">
              {recent.map(pred => {
                const fixture = fixtureMap.get(pred.fixture_id)
                if (!fixture) return null
                const isScored = pred.points_earned !== null
                const pts = pred.points_earned ?? 0
                return (
                  <div key={pred.id} className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {fixture.home_team_name} vs {fixture.away_team_name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        My pick: {pred.predicted_home_score}–{pred.predicted_away_score}
                        {isScored && ` · Result: ${fixture.home_score}–${fixture.away_score}`}
                        {pred.is_perfect && ' · 🎯'}
                      </p>
                    </div>
                    <span className={`shrink-0 text-sm font-black ${
                      !isScored ? 'text-zinc-500' : pts > 0 ? 'text-green-400' : 'text-zinc-600'
                    }`}>
                      {!isScored ? 'Pending' : pts > 0 ? `+${pts}` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-zinc-800 p-8 text-center">
            <p className="mb-3 text-zinc-400">No predictions yet.</p>
            <Link href="/tournaments" className="text-sm font-semibold text-white underline underline-offset-2">
              Make your first prediction →
            </Link>
          </div>
        )}

      </div>
    </main>
  )
}
