import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import FixtureCard from './_components/FixtureCard'
import type { Prediction } from '@/types/database'
import { WC_TOURNAMENT_ID } from '@/lib/wc2026-groups'

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: tournament }, { data: fixtures }, { data: predictions }, { data: profile }] = await Promise.all([
    supabase.from('tournaments').select('*').eq('id', id).single(),
    supabase.from('fixtures').select('*').eq('tournament_id', id).order('kickoff_time'),
    supabase.from('predictions').select('*').eq('user_id', user.id),
    supabase.from('users').select('username').eq('id', user.id).single(),
  ])

  const username = profile?.username ?? user.email?.split('@')[0] ?? 'predictr'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  if (!tournament) notFound()

  const predictionMap = new Map<string, Prediction>(
    (predictions ?? []).map(p => [p.fixture_id, p])
  )

  type FixtureRow = NonNullable<typeof fixtures>[number]
  const stages = Array.from(
    (fixtures ?? []).reduce((acc, f) => {
      if (!acc.has(f.stage)) acc.set(f.stage, [])
      acc.get(f.stage)!.push(f)
      return acc
    }, new Map<string, FixtureRow[]>())
  )

  const now = new Date()
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

        {/* World Cup prediction hub */}
        {id === WC_TOURNAMENT_ID && (
          <div className="mb-6 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/world-cup/bracket"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
              >
                <div>
                  <p className="text-sm font-black text-white">Group Stage</p>
                  <p className="text-xs text-zinc-400">Pick 1st &amp; 2nd</p>
                </div>
                <span className="text-zinc-400">→</span>
              </Link>
              <Link
                href="/world-cup/knockout"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
              >
                <div>
                  <p className="text-sm font-black text-white">Knockout</p>
                  <p className="text-xs text-zinc-400">Full bracket + champion</p>
                </div>
                <span className="text-zinc-400">→</span>
              </Link>
            </div>
            <Link
              href="/world-cup/leaderboard"
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
            >
              <div>
                <p className="text-sm font-black text-white">Leaderboard</p>
                <p className="text-xs text-zinc-400">See who&apos;s winning</p>
              </div>
              <span className="text-zinc-400">→</span>
            </Link>
          </div>
        )}

        {/* Fixtures */}
        {!fixtures?.length ? (
          <div className="rounded-2xl border border-border bg-surface-1 p-10 text-center">
            <p className="text-fg-2">No fixtures yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {stages.map(([stage, stageFixtures]) => (
              <div key={stage}>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-fg-3">{stage}</h2>
                <div className="space-y-3">
                  {stageFixtures!.map(fixture => {
                    const locked = fixture.status !== 'scheduled' || new Date(fixture.kickoff_time) <= now
                    return (
                      <FixtureCard
                        key={fixture.id}
                        fixture={fixture}
                        tournamentId={id}
                        existing={predictionMap.get(fixture.id) ?? null}
                        locked={locked}
                        username={username}
                        siteUrl={siteUrl}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  )
}
