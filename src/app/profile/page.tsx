import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogoutButton } from '../tournaments/_components/LogoutButton'
import { computeStreak } from '@/lib/streak'
import { computeBadges } from '@/lib/badges'
import { WC_TOURNAMENT_ID } from '@/lib/wc2026-groups'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: predictions }, { data: leagues }, { count: wcGroupCount }] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('predictions').select('*').eq('user_id', user.id),
    supabase.from('league_members').select('league_id').eq('user_id', user.id),
    supabase
      .from('bracket_predictions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('tournament_id', WC_TOURNAMENT_ID),
  ])

  const allPredictions = predictions ?? []
  const scored = allPredictions.filter(p => p.points_earned !== null)
  const totalPoints = scored.reduce((sum, p) => sum + (p.points_earned ?? 0), 0)
  const perfectScores = scored.filter(p => p.is_perfect).length
  const correct = scored.filter(p => (p.points_earned ?? 0) > 0).length
  const accuracy = scored.length > 0 ? Math.round((correct / scored.length) * 100) : 0
  const leagueCount = leagues?.length ?? 0
  const streak = computeStreak(allPredictions)
  const badges = computeBadges(allPredictions, wcGroupCount ?? 0)
  const earnedBadges = badges.filter(b => b.earned)

  const recentScored = [...scored]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)

  const fixtureIds = recentScored.map(p => p.fixture_id)
  const { data: fixtures } = fixtureIds.length
    ? await supabase.from('fixtures').select('id, home_team_name, away_team_name, home_score, away_score, kickoff_time').in('id', fixtureIds)
    : { data: [] }

  const fixtureMap = new Map((fixtures ?? []).map(f => [f.id, f]))
  const username = profile?.username ?? user.email?.split('@')[0] ?? 'User'

  return (
    <main className="min-h-screen bg-pitch px-4 py-8">
      <div className="mx-auto max-w-lg">

        <div className="mb-6 flex items-center justify-between">
          <Link href="/tournaments" className="text-sm text-fg-3 transition hover:text-fg-2">
            ← Tournaments
          </Link>
          <LogoutButton />
        </div>

        {/* Profile card */}
        <div className="mb-6 rounded-2xl border border-border bg-surface-1 p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-2 text-2xl font-black text-fg-1">
              {username[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black text-fg-1">{username}</h1>
              <p className="truncate text-sm text-fg-3">{user.email}</p>
            </div>
          </div>

          {/* Stats scoreboard */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              { label: 'Points', value: String(totalPoints), highlight: true },
              { label: 'Accuracy', value: `${accuracy}%`, highlight: false },
              { label: 'Picks', value: String(allPredictions.length), highlight: false },
              { label: 'Leagues', value: String(leagueCount), highlight: false },
            ] as const).map(stat => (
              <div key={stat.label} className="rounded-xl bg-surface-2 p-3 text-center">
                <p className={`font-mono text-xl font-black ${stat.highlight ? 'text-gold' : 'text-fg-1'}`}>
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-fg-3">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Streak */}
          {streak >= 2 && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-orange-500/10 px-4 py-3">
              <span className="text-xl">🔥</span>
              <p className="text-sm font-black text-orange-400">
                {streak} pick streak — keep it going!
              </p>
            </div>
          )}
          {streak === 1 && (
            <p className="mt-4 text-center text-sm font-bold text-orange-400">🔥 1 pick streak</p>
          )}

          {perfectScores > 0 && (
            <p className="mt-4 text-center text-sm font-bold text-goal">
              🎯 {perfectScores} perfect {perfectScores === 1 ? 'score' : 'scores'}
            </p>
          )}
        </div>

        {/* Badges */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-fg-3">Badges</h2>
            <span className="text-xs text-fg-3">{earnedBadges.length}/{badges.length}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {badges.map(badge => (
              <div
                key={badge.id}
                title={badge.earned ? badge.description : `Locked: ${badge.description}`}
                className={`flex flex-col items-center gap-1 rounded-xl p-3 text-center transition ${
                  badge.earned
                    ? 'bg-surface-1 border border-border'
                    : 'bg-surface-1 border border-border opacity-30 grayscale'
                }`}
              >
                <span className="text-2xl">{badge.emoji}</span>
                <p className="text-[10px] font-bold leading-tight text-fg-2">{badge.name}</p>
              </div>
            ))}
          </div>
          {earnedBadges.length === 0 && (
            <p className="mt-3 text-center text-xs text-fg-3">
              Make predictions to unlock badges
            </p>
          )}
        </div>

        {/* Recent results */}
        {recentScored.length > 0 ? (
          <>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-fg-3">Recent Results</h2>
            <div className="space-y-2">
              {recentScored.map(pred => {
                const fixture = fixtureMap.get(pred.fixture_id)
                if (!fixture) return null
                const pts = pred.points_earned ?? 0
                return (
                  <div key={pred.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface-1 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-bold text-fg-1">
                        {fixture.home_team_name} {fixture.home_score}–{fixture.away_score} {fixture.away_team_name}
                      </p>
                      <p className="font-mono text-xs text-fg-3">
                        My pick: {pred.predicted_home_score}–{pred.predicted_away_score}
                        {pred.is_perfect && ' · 🎯'}
                      </p>
                    </div>
                    <span className={`shrink-0 font-mono text-sm font-black ${pts > 0 ? 'text-goal' : 'text-fg-3'}`}>
                      {pts > 0 ? `+${pts}` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-border bg-surface-1 p-10 text-center">
            <p className="mb-3 text-fg-2">No results yet.</p>
            <Link href="/tournaments" className="text-sm font-bold text-fg-1 underline underline-offset-2">
              Make your first prediction →
            </Link>
          </div>
        )}

      </div>
    </main>
  )
}
