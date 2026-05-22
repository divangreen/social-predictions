import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { WC2026_GROUPS, WC_LOCK_DATE, WC_TOURNAMENT_ID } from '@/lib/wc2026-groups'
import type { KnockoutPicks } from '@/lib/wc2026-bracket'

function daysUntil(date: Date) {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000))
}

export default async function WCHubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locked = new Date() >= WC_LOCK_DATE
  const daysLeft = daysUntil(WC_LOCK_DATE)

  const [
    { data: groupPicks },
    { data: knockoutRow },
    { data: predictions },
    { data: fixtures },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from('bracket_predictions')
      .select('group_letter, first_place, second_place, points_earned')
      .eq('user_id', user.id)
      .eq('tournament_id', WC_TOURNAMENT_ID),
    supabase
      .from('knockout_picks')
      .select('picks, points_earned')
      .eq('user_id', user.id)
      .eq('tournament_id', WC_TOURNAMENT_ID)
      .single(),
    supabase
      .from('predictions')
      .select('id, points_earned')
      .eq('user_id', user.id)
      .in('fixture_id',
        (await supabase.from('fixtures').select('id').eq('tournament_id', WC_TOURNAMENT_ID)).data?.map(f => f.id) ?? []
      ),
    supabase
      .from('fixtures')
      .select('id')
      .eq('tournament_id', WC_TOURNAMENT_ID),
    supabase.from('users').select('username').eq('id', user.id).single(),
  ])

  const knockoutPicks = knockoutRow?.picks as unknown as KnockoutPicks | null
  const champion = knockoutPicks?.champion ?? null
  const topScorer = knockoutPicks?.topScorer ?? null

  const groupsSubmitted = (groupPicks ?? []).length
  const groupsScored = (groupPicks ?? []).filter(g => g.points_earned !== null).length
  const groupPoints = (groupPicks ?? []).reduce((sum, g) => sum + (g.points_earned ?? 0), 0)

  const knockoutPoints = knockoutRow?.points_earned ?? 0
  const matchPredictions = (predictions ?? []).length
  const matchPoints = (predictions ?? []).reduce((sum, p) => sum + (p.points_earned ?? 0), 0)
  const totalPoints = groupPoints + knockoutPoints + matchPoints

  const knockoutRoundsFilled = knockoutPicks
    ? [
        (knockoutPicks.thirdQualifiers ?? []).filter(Boolean).length,
        (knockoutPicks.r32 ?? []).filter(Boolean).length,
        (knockoutPicks.r16 ?? []).filter(Boolean).length,
        (knockoutPicks.qf ?? []).filter(Boolean).length,
        (knockoutPicks.sf ?? []).filter(Boolean).length,
      ].some(n => n > 0)
    : false

  const username = profile?.username ?? user.email?.split('@')[0] ?? 'user'

  const groupPickMap = new Map((groupPicks ?? []).map(g => [g.group_letter, g]))

  return (
    <main className="min-h-screen bg-pitch px-4 py-8">
      <div className="mx-auto max-w-lg">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/tournaments" className="text-sm text-fg-3 hover:text-fg-1 transition">
            ← Home
          </Link>
          <Link href="/world-cup/leaderboard" className="text-sm font-bold text-fg-2 hover:text-fg-1 transition">
            Leaderboard →
          </Link>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl">🏆</span>
            <h1 className="text-2xl font-black text-fg-1">World Cup 2026</h1>
          </div>
          <p className="text-sm text-fg-3">
            {locked ? 'Predictions locked · tournament underway' : `Picks lock in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} · June 11`}
          </p>
        </div>

        {/* Points summary */}
        <div className="mb-6 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-border bg-surface-1 px-3 py-3 text-center">
            <p className="font-mono text-2xl font-black text-fg-1">{totalPoints}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-fg-3">Total pts</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-1 px-3 py-3 text-center">
            <p className="font-mono text-2xl font-black text-fg-1">{groupsSubmitted}/12</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-fg-3">Groups</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-1 px-3 py-3 text-center">
            <p className="font-mono text-2xl font-black text-fg-1">{matchPredictions}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-fg-3">Predictions</p>
          </div>
        </div>

        {/* Champion + top scorer */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <Link
            href="/world-cup/bracket"
            className={`rounded-2xl border p-4 transition hover:border-fg-3 active:scale-[0.98] ${champion ? 'border-gold/25 bg-gold/5' : 'border-border bg-surface-1'}`}
          >
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-fg-3">Champion</p>
            {champion ? (
              <p className="truncate font-black text-gold">🌍 {champion}</p>
            ) : (
              <p className="text-sm font-bold text-fg-3">{locked ? 'Not picked' : 'Pick now →'}</p>
            )}
          </Link>
          <Link
            href={`/tournaments/${WC_TOURNAMENT_ID}`}
            className={`rounded-2xl border p-4 transition hover:border-fg-3 active:scale-[0.98] ${topScorer ? 'border-border bg-surface-2' : 'border-border bg-surface-1'}`}
          >
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-fg-3">Top scorer</p>
            {topScorer ? (
              <p className="truncate font-black text-fg-1">⚽ {topScorer}</p>
            ) : (
              <p className="text-sm font-bold text-fg-3">{locked ? 'Not picked' : 'Pick now →'}</p>
            )}
          </Link>
        </div>

        {/* Section cards */}
        <div className="space-y-2 mb-6">

          <Link
            href="/world-cup/bracket"
            className="flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-5 py-4 transition hover:border-fg-3 active:scale-[0.98]"
          >
            <div>
              <p className="font-bold text-fg-1">Group picks</p>
              <p className="text-xs text-fg-3">
                {groupsSubmitted === 12
                  ? groupsScored > 0 ? `${groupPoints} pts · ${groupsScored}/12 scored` : 'All 12 groups submitted'
                  : groupsSubmitted > 0 ? `${groupsSubmitted}/12 groups done` : 'Pick 1st & 2nd in each group'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {groupsSubmitted === 12
                ? <span className="text-xs font-bold text-goal">✓ Done</span>
                : <span className="text-xs font-bold text-gold">{locked ? '' : 'Incomplete'}</span>
              }
              <span className="text-fg-3">→</span>
            </div>
          </Link>

          <Link
            href="/world-cup/knockout"
            className="flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-5 py-4 transition hover:border-fg-3 active:scale-[0.98]"
          >
            <div>
              <p className="font-bold text-fg-1">Knockout bracket</p>
              <p className="text-xs text-fg-3">
                {knockoutRoundsFilled ? 'Bracket filled in' : 'Pick your path to the final'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {knockoutRoundsFilled
                ? <span className="text-xs font-bold text-goal">✓ Done</span>
                : <span className="text-xs font-bold text-gold">{locked ? '' : 'Incomplete'}</span>
              }
              <span className="text-fg-3">→</span>
            </div>
          </Link>

          <Link
            href={`/tournaments/${WC_TOURNAMENT_ID}`}
            className="flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-5 py-4 transition hover:border-fg-3 active:scale-[0.98]"
          >
            <div>
              <p className="font-bold text-fg-1">Match predictions</p>
              <p className="text-xs text-fg-3">
                {matchPredictions > 0 ? `${matchPredictions} picks · ${matchPoints} pts earned` : 'Predict exact scorelines'}
              </p>
            </div>
            <span className="text-fg-3">→</span>
          </Link>

          <Link
            href="/world-cup/standings"
            className="flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-5 py-4 transition hover:border-fg-3 active:scale-[0.98]"
          >
            <div>
              <p className="font-bold text-fg-1">Group standings</p>
              <p className="text-xs text-fg-3">Live tables · see how your picks are tracking</p>
            </div>
            <span className="text-fg-3">→</span>
          </Link>

        </div>

        {/* Groups overview grid */}
        {groupsSubmitted > 0 && (
          <>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-fg-3">My group picks</h2>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {WC2026_GROUPS.map(group => {
                const pick = groupPickMap.get(group.letter)
                return (
                  <div key={group.letter} className="rounded-xl border border-border bg-surface-1 px-3 py-2.5">
                    <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-fg-3">
                      Group {group.letter}
                    </p>
                    {pick ? (
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-fg-1">🥇 {pick.first_place}</p>
                        <p className="text-xs text-fg-2">🥈 {pick.second_place}</p>
                        {pick.points_earned !== null && (
                          <p className="text-[10px] font-bold text-gold">+{pick.points_earned} pts</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-fg-3">Not picked</p>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Share */}
        <Link
          href={`/world-cup/u/${username}`}
          className="block rounded-2xl border border-border px-5 py-4 text-center text-sm font-bold text-fg-2 transition hover:border-fg-3 hover:text-fg-1 active:scale-[0.98]"
        >
          View my public bracket →
        </Link>

      </div>
    </main>
  )
}
