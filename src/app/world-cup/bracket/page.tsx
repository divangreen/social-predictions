import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { WC2026_GROUPS, WC_LOCK_DATE, WC_TOURNAMENT_ID } from '@/lib/wc2026-groups'
import { saveBracketPicks } from './actions'

const ERRORS: Record<string, string> = {
  locked: 'Predictions are locked — the tournament has started.',
  invalid: 'Please pick a winner and runner-up for each group.',
  save_failed: 'Something went wrong. Try again.',
}

function daysUntil(date: Date) {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000))
}

export default async function WCBracketPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error, saved } = await searchParams
  const locked = new Date() >= WC_LOCK_DATE
  const daysLeft = daysUntil(WC_LOCK_DATE)

  // Load existing picks
  const { data: existing } = await supabase
    .from('bracket_predictions')
    .select('group_letter, first_place, second_place')
    .eq('user_id', user.id)
    .eq('tournament_id', WC_TOURNAMENT_ID)

  const picksMap = new Map(existing?.map(r => [r.group_letter, r]) ?? [])
  const hasPicks = (picksMap.size ?? 0) > 0

  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="mx-auto max-w-lg">

        <div className="mb-4 flex items-center justify-between">
          <Link href="/tournaments" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300">
            ← Tournaments
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/world-cup/knockout" className="text-sm font-bold text-zinc-400 hover:text-white transition">
              Knockout →
            </Link>
            <Link href="/world-cup/leaderboard" className="text-sm font-bold text-zinc-400 hover:text-white transition">
              Leaderboard →
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <h1 className="text-2xl font-black tracking-tight text-white">World Cup Groups</h1>
          </div>
          <p className="text-sm text-zinc-500">Pick who finishes 1st and 2nd in each group.</p>
        </div>

        {/* Countdown or locked */}
        {locked ? (
          <div className="mb-6 rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-center">
            <p className="font-semibold text-zinc-300">Predictions are locked</p>
            <p className="text-sm text-zinc-500">The tournament has started.</p>
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-2xl font-black text-white">{daysLeft}</p>
            <p className="text-sm text-zinc-400">days to lock in your picks</p>
          </div>
        )}

        {error && (
          <p className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {ERRORS[error] ?? 'Something went wrong.'}
          </p>
        )}

        {saved && (
          <p className="mb-4 rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-400">
            ✓ Picks saved! {hasPicks ? 'Good luck.' : ''}
          </p>
        )}

        <form action={saveBracketPicks} className="space-y-4">
          {WC2026_GROUPS.map(group => {
            const pick = picksMap.get(group.letter)
            return (
              <div key={group.letter} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">
                  Group {group.letter}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-400">Winner</label>
                    <select
                      name={`first_${group.letter}`}
                      defaultValue={pick?.first_place ?? ''}
                      disabled={locked}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none transition focus:border-zinc-500 disabled:opacity-50"
                    >
                      <option value="">Pick…</option>
                      {group.teams.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-400">Runner-up</label>
                    <select
                      name={`second_${group.letter}`}
                      defaultValue={pick?.second_place ?? ''}
                      disabled={locked}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none transition focus:border-zinc-500 disabled:opacity-50"
                    >
                      <option value="">Pick…</option>
                      {group.teams.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )
          })}

          {!locked && (
            <button
              type="submit"
              className="w-full rounded-2xl bg-white py-4 text-sm font-black text-black transition hover:bg-zinc-200 active:scale-[0.98]"
            >
              {hasPicks ? 'Update picks' : 'Lock in my picks 🔒'}
            </button>
          )}
        </form>

      </div>
    </main>
  )
}
