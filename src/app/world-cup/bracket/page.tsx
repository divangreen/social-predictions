import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { WC2026_GROUPS, WC_LOCK_DATE, WC_TOURNAMENT_ID } from '@/lib/wc2026-groups'
import { saveBracketPicks } from './actions'
import ShareBracketButton from '../_components/ShareBracketButton'
import { saveChampionPick } from '../knockout/actions'
import type { KnockoutPicks } from '@/lib/wc2026-bracket'

const ERRORS: Record<string, string> = {
  locked: 'Predictions are locked — the tournament has started.',
  invalid: 'Please pick a winner and runner-up for each group.',
  save_failed: 'Something went wrong. Try again.',
}

const ALL_WC_TEAMS = [
  'USA','Panama','El Salvador','Costa Rica',
  'Mexico','Ecuador','Jamaica','Venezuela',
  'Canada','Morocco','Croatia','Belgium',
  'Argentina','Chile','Peru','Australia',
  'Brazil','Paraguay','Colombia','Cameroon',
  'France','Uruguay','Iran','Senegal',
  'Spain','Turkey','Serbia','Japan',
  'England','Nigeria','Albania','Algeria',
  'Germany','Saudi Arabia','South Korea','Ukraine',
  'Portugal','Czech Republic','Tunisia','New Zealand',
  'Netherlands','Qatar','South Africa','Honduras',
  'Switzerland','Bosnia-Herzegovina','Poland','Ghana',
].sort()

function daysUntil(date: Date) {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000))
}

export default async function WCBracketPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; saved_champion?: string; skipped?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error, saved, saved_champion, skipped } = await searchParams
  const locked = new Date() >= WC_LOCK_DATE
  const daysLeft = daysUntil(WC_LOCK_DATE)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://social-predictions.vercel.app'

  const [{ data: existing }, { data: profile }, { data: knockoutRow }] = await Promise.all([
    supabase
      .from('bracket_predictions')
      .select('group_letter, first_place, second_place')
      .eq('user_id', user.id)
      .eq('tournament_id', WC_TOURNAMENT_ID),
    supabase.from('users').select('username').eq('id', user.id).single(),
    supabase
      .from('knockout_picks')
      .select('picks')
      .eq('user_id', user.id)
      .eq('tournament_id', WC_TOURNAMENT_ID)
      .single(),
  ])

  const existingChampion = (knockoutRow?.picks as unknown as KnockoutPicks | null)?.champion ?? null

  const picksMap = new Map(existing?.map(r => [r.group_letter, r]) ?? [])
  const hasPicks = (picksMap.size ?? 0) > 0
  const username = profile?.username ?? user.email?.split('@')[0] ?? 'user'

  return (
    <main className="min-h-screen bg-pitch px-4 py-8">
      <div className="mx-auto max-w-lg">

        <div className="mb-4 flex items-center justify-between">
          <Link href="/tournaments" className="inline-flex items-center gap-1 text-sm text-fg-3 hover:text-fg-1">
            ← Tournaments
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/world-cup/knockout" className="text-sm font-bold text-fg-2 hover:text-fg-1 transition">
              Knockout →
            </Link>
            <Link href="/world-cup/leaderboard" className="text-sm font-bold text-fg-2 hover:text-fg-1 transition">
              Leaderboard →
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <h1 className="text-2xl font-black tracking-tight text-fg-1">World Cup Groups</h1>
          </div>
          <p className="text-sm text-fg-3">Pick who finishes 1st and 2nd in each group.</p>
        </div>

        {/* Countdown or locked */}
        {locked ? (
          <div className="mb-6 rounded-2xl border border-border bg-surface-1 p-4 text-center">
            <p className="font-semibold text-fg-2">Predictions are locked</p>
            <p className="text-sm text-fg-3">The tournament has started.</p>
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border border-border bg-surface-1 p-4 text-center">
            <p className="text-2xl font-black text-fg-1">{daysLeft}</p>
            <p className="text-sm text-fg-2">days to lock in your picks</p>
          </div>
        )}

        {error && (
          <p className="mb-4 rounded-xl bg-live/10 px-4 py-3 text-sm text-live">
            {ERRORS[error] ?? 'Something went wrong.'}
          </p>
        )}

        {saved && (
          <p className="mb-4 rounded-xl bg-goal/10 px-4 py-3 text-sm text-goal">
            ✓ Picks saved! {hasPicks ? 'Good luck.' : ''}
          </p>
        )}

        {skipped && Number(skipped) > 0 && (
          <p className="mb-4 rounded-xl bg-gold/10 px-4 py-3 text-sm text-gold">
            {Number(skipped)} group{Number(skipped) > 1 ? 's were' : ' was'} not saved — pick different teams for 1st and 2nd in each group.
          </p>
        )}

        {saved_champion && (
          <p className="mb-4 rounded-xl bg-goal/10 px-4 py-3 text-sm text-goal">
            ✓ Champion pick saved!
          </p>
        )}

        {/* Champion pick */}
        <form action={saveChampionPick} className="mb-6 rounded-2xl border-2 border-fg-1 bg-surface-1 p-4">
          <input type="hidden" name="redirect_to" value="/world-cup/bracket" />
          <p className="mb-1 text-base font-black text-fg-1">Who wins the World Cup?</p>
          <p className="mb-3 text-xs text-fg-3">
            {existingChampion ? `Your pick: ${existingChampion}` : 'Pick your champion'}
          </p>
          <div className="flex gap-2">
            <select
              name="champion"
              defaultValue={existingChampion ?? ''}
              disabled={locked}
              className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-fg-1 outline-none transition focus:border-fg-3 disabled:opacity-50"
            >
              <option value="">Select a team…</option>
              {ALL_WC_TEAMS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {!locked && (
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-fg-1 px-4 py-2 text-xs font-black text-pitch hover:opacity-90 transition"
              >
                Save
              </button>
            )}
          </div>
        </form>

        <form action={saveBracketPicks} className="space-y-4">
          {WC2026_GROUPS.map(group => {
            const pick = picksMap.get(group.letter)
            return (
              <div key={group.letter} className="rounded-2xl border border-border bg-surface-1 p-4">
                <p className="mb-3 text-xs font-black uppercase tracking-widest text-fg-3">
                  Group {group.letter}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-fg-2">Winner</label>
                    <select
                      name={`first_${group.letter}`}
                      defaultValue={pick?.first_place ?? ''}
                      disabled={locked}
                      className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-fg-1 outline-none transition focus:border-fg-3 disabled:opacity-50"
                    >
                      <option value="">Pick…</option>
                      {group.teams.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-fg-2">Runner-up</label>
                    <select
                      name={`second_${group.letter}`}
                      defaultValue={pick?.second_place ?? ''}
                      disabled={locked}
                      className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-fg-1 outline-none transition focus:border-fg-3 disabled:opacity-50"
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
              className="w-full rounded-2xl bg-fg-1 py-4 text-sm font-black text-pitch transition hover:opacity-90 active:scale-[0.98]"
            >
              {hasPicks ? 'Update picks' : 'Lock in my picks 🔒'}
            </button>
          )}
        </form>

        {hasPicks && (
          <div className="mt-3">
            <ShareBracketButton username={username} siteUrl={siteUrl} />
          </div>
        )}

      </div>
    </main>
  )
}
