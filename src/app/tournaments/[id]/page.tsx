import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { RealtimeFixtureList } from './_components/RealtimeFixtureList'
import type { Prediction } from '@/types/database'
import { WC_TOURNAMENT_ID } from '@/lib/wc2026-groups'
import { saveChampionPick, saveTopScorerPick } from '@/app/world-cup/knockout/actions'
import type { KnockoutPicks } from '@/lib/wc2026-bracket'

const WC_TEAMS = [
  'Albania','Algeria','Argentina','Australia','Belgium','Bosnia-Herzegovina',
  'Brazil','Cameroon','Canada','Chile','Colombia','Costa Rica',
  'Croatia','Czech Republic','Ecuador','El Salvador','England','France',
  'Germany','Ghana','Honduras','Iran','Jamaica','Japan',
  'Mexico','Morocco','Netherlands','New Zealand','Nigeria','Panama',
  'Paraguay','Peru','Poland','Portugal','Qatar','Saudi Arabia',
  'Senegal','Serbia','South Africa','South Korea','Spain','Switzerland',
  'Tunisia','Turkey','Ukraine','Uruguay','USA','Venezuela',
]

const WC_TOP_SCORERS = [
  'Kylian Mbappé', 'Vinicius Jr', 'Lionel Messi', 'Lamine Yamal',
  'Jude Bellingham', 'Bukayo Saka', 'Julián Álvarez', 'Pedri',
  'Luis Díaz', 'Darwin Núñez', 'Federico Valverde', 'Bruno Fernandes',
  'Cristiano Ronaldo', 'Richarlison', 'Ademola Lookman', 'Cody Gakpo',
  'Memphis Depay', 'Christian Pulisic', 'Jonathan David', 'Leroy Sané',
  'Kai Havertz', 'Sadio Mané', 'Carlos Vela', 'Alvaro Morata',
  'Harry Kane', 'Robert Lewandowski',
].sort()

export default async function TournamentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved_champion?: string; saved_top_scorer?: string; error?: string }>
}) {
  const { id } = await params
  const { saved_champion, saved_top_scorer, error: spError } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('*')
    .eq('tournament_id', id)
    .order('kickoff_time', { ascending: true })

  const fixtureIds = (fixtures ?? []).map(f => f.id)

  const [{ data: tournament }, { data: predictions }, { data: profile }, { data: knockoutRow }] = await Promise.all([
    supabase.from('tournaments').select('*').eq('id', id).single(),
    fixtureIds.length
      ? supabase.from('predictions').select('*').eq('user_id', user.id).in('fixture_id', fixtureIds)
      : Promise.resolve({ data: [] }),
    supabase.from('users').select('username').eq('id', user.id).single(),
    id === WC_TOURNAMENT_ID
      ? supabase.from('knockout_picks').select('picks').eq('user_id', user.id).eq('tournament_id', WC_TOURNAMENT_ID).single()
      : Promise.resolve({ data: null }),
  ])

  // knockout_picks.picks is typed as Record<string,unknown> in the DB schema
  // (Supabase can't express nested JSON shapes); cast to the app type here.
  const existingKnockout = knockoutRow?.picks as unknown as KnockoutPicks | null
  const existingChampion = existingKnockout?.champion ?? null
  const existingTopScorer = existingKnockout?.topScorer ?? null

  const username = profile?.username ?? user.email?.split('@')[0] ?? 'predictr'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  if (!tournament) notFound()

  const predictionMap = new Map<string, Prediction>(
    (predictions ?? []).map(p => [p.fixture_id, p])
  )

  const isLive = tournament.status === 'active'

  return (
    <main className="min-h-screen bg-pitch px-4 py-8">
      <div className="mx-auto max-w-lg">

        {/* Header */}
        <div className="mb-6">
          <Link href="/tournaments" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-3 transition hover:text-fg-2">
            ← Back
          </Link>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-fg-1">{tournament.name}</h1>
              <p className="mt-0.5 text-sm capitalize text-fg-3">{tournament.sport}</p>
            </div>
            {isLive && (
              <span className="mt-1 flex shrink-0 items-center gap-1.5 rounded-full bg-live/10 px-3 py-1 text-xs font-bold text-live">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
                Live
              </span>
            )}
          </div>
        </div>

        {/* Prediction progress bar */}
        {fixtures && fixtures.length > 0 && (
          <div className="mb-6">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-bold text-fg-3">
                {predictionMap.size === fixtures.length
                  ? '🎯 All matches predicted!'
                  : `${predictionMap.size} / ${fixtures.length} matches predicted`}
              </span>
              {predictionMap.size < fixtures.length && (
                <span className="text-xs font-bold text-fg-3">{fixtures.length - predictionMap.size} to go</span>
              )}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  predictionMap.size === fixtures.length ? 'bg-goal' : 'bg-gold'
                }`}
                style={{ width: `${Math.round((predictionMap.size / fixtures.length) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* World Cup prediction hub */}
        {id === WC_TOURNAMENT_ID && (
          <div className="mb-6 space-y-2">

            {/* Toast messages */}
            {saved_champion && (
              <p className="rounded-xl bg-green-500/10 px-4 py-2 text-sm text-green-400">Champion pick saved!</p>
            )}
            {saved_top_scorer && (
              <p className="rounded-xl bg-green-500/10 px-4 py-2 text-sm text-green-400">Top scorer pick saved!</p>
            )}
            {spError === 'no_champion' && (
              <p className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-400">Please select a team first.</p>
            )}
            {spError === 'no_top_scorer' && (
              <p className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-400">Please select a player first.</p>
            )}
            {spError === 'save_failed' && (
              <p className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-400">Something went wrong. Try again.</p>
            )}

            {/* Champion pick */}
            <form action={saveChampionPick} className="rounded-2xl border-2 border-fg-1 bg-surface-1 p-4">
              <input type="hidden" name="redirect_to" value={`/tournaments/${id}`} />
              <p className="mb-1 text-base font-black text-fg-1">Who wins the World Cup?</p>
              <p className="mb-3 text-xs text-fg-3">
                {existingChampion ? `Your pick: ${existingChampion}` : 'Pick your champion'}
              </p>
              <div className="flex gap-2">
                <select
                  name="champion"
                  defaultValue={existingChampion ?? ''}
                  className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-fg-1 outline-none transition focus:border-fg-1"
                >
                  <option value="">Select a team…</option>
                  {WC_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-fg-1 px-4 py-2 text-xs font-black text-pitch hover:opacity-90 transition"
                >
                  Save
                </button>
              </div>
            </form>

            {/* Top scorer pick */}
            <form action={saveTopScorerPick} className="rounded-2xl border border-border bg-surface-1 p-4">
              <input type="hidden" name="redirect_to" value={`/tournaments/${id}`} />
              <p className="mb-1 text-base font-black text-fg-1">Top scorer?</p>
              <p className="mb-3 text-xs text-fg-3">
                {existingTopScorer ? `Your pick: ${existingTopScorer}` : 'Pick the golden boot winner'}
              </p>
              <div className="flex gap-2">
                <select
                  name="top_scorer"
                  defaultValue={existingTopScorer ?? ''}
                  className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-fg-1 outline-none transition focus:border-fg-1"
                >
                  <option value="">Select a player…</option>
                  {WC_TOP_SCORERS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-fg-1 px-4 py-2 text-xs font-black text-pitch hover:opacity-90 transition"
                >
                  Save
                </button>
              </div>
            </form>

            {/* Nav tiles */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/world-cup/bracket"
                className="flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3 transition hover:bg-surface-2"
              >
                <div>
                  <p className="text-sm font-black text-fg-1">Group Stage</p>
                  <p className="text-xs text-fg-3">Pick 1st &amp; 2nd</p>
                </div>
                <span className="text-fg-3">→</span>
              </Link>
              <Link
                href="/world-cup/knockout"
                className="flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3 transition hover:bg-surface-2"
              >
                <div>
                  <p className="text-sm font-black text-fg-1">Knockout</p>
                  <p className="text-xs text-fg-3">Full bracket + champion</p>
                </div>
                <span className="text-fg-3">→</span>
              </Link>
            </div>
            <Link
              href="/world-cup/leaderboard"
              className="flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3 transition hover:bg-surface-2"
            >
              <div>
                <p className="text-sm font-black text-fg-1">Leaderboard</p>
                <p className="text-xs text-fg-3">See who&apos;s winning</p>
              </div>
              <span className="text-fg-3">→</span>
            </Link>
          </div>
        )}

        {/* Fixtures */}
        {!fixtures?.length ? (
          <div className="rounded-2xl border border-border bg-surface-1 p-10 text-center">
            <p className="text-fg-2">No fixtures yet.</p>
          </div>
        ) : (
          <RealtimeFixtureList
            initialFixtures={fixtures}
            predictions={Array.from(predictionMap.entries())}
            tournamentId={id}
            tournamentSport={tournament.sport}
            username={username}
            siteUrl={siteUrl}
          />
        )}

      </div>
    </main>
  )
}
