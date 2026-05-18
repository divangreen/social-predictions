import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import FixtureCard from './_components/FixtureCard'
import type { Prediction } from '@/types/database'

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

  // Group fixtures by stage
  type FixtureRow = NonNullable<typeof fixtures>[number]
  const stages = Array.from(
    (fixtures ?? []).reduce((acc, f) => {
      if (!acc.has(f.stage)) acc.set(f.stage, [])
      acc.get(f.stage)!.push(f)
      return acc
    }, new Map<string, FixtureRow[]>())
  )

  const now = new Date()

  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="mx-auto max-w-lg">

        {/* Header */}
        <div className="mb-6">
          <Link href="/tournaments" className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300">
            ← Tournaments
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-white">{tournament.name}</h1>
          <p className="text-sm capitalize text-zinc-500">{tournament.sport}</p>
        </div>

        {/* Fixtures by stage */}
        {!fixtures?.length ? (
          <div className="rounded-2xl border border-zinc-800 p-8 text-center">
            <p className="text-zinc-400">No fixtures yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {stages.map(([stage, stageFixtures]) => (
              <div key={stage}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">{stage}</h2>
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
