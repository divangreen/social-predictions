import type { Metadata } from 'next'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{
    home?: string
    away?: string
    hs?: string
    as?: string
    ph?: string
    pa?: string
    pr?: string
    u?: string
    pts?: string
    p?: string
  }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams
  const user = sp.u ?? 'Someone'
  const home = sp.home ?? 'Home'
  const away = sp.away ?? 'Away'
  const pts = sp.pts ?? '0'
  const perfect = sp.p === '1'

  const title = perfect
    ? `🎯 ${user} got a perfect score on ${home} vs ${away}!`
    : `${user} called ${home} vs ${away} — predictr`

  return {
    title,
    description: `+${pts} pts · predictr predictions`,
    openGraph: { title, description: `+${pts} pts · predictr` },
    twitter: { card: 'summary', title, description: `+${pts} pts · predictr` },
  }
}

export default async function SharePredictionPage({ searchParams }: Props) {
  const sp = await searchParams
  const home = sp.home ?? 'Home'
  const away = sp.away ?? 'Away'
  const user = sp.u ?? 'predictr'
  const pts = Number(sp.pts ?? 0)
  const perfect = sp.p === '1'
  const actualHome = sp.hs != null && sp.hs !== '' ? Number(sp.hs) : null
  const actualAway = sp.as != null && sp.as !== '' ? Number(sp.as) : null
  const predHome = sp.ph != null && sp.ph !== '' ? Number(sp.ph) : null
  const predAway = sp.pa != null && sp.pa !== '' ? Number(sp.pa) : null
  const predResult = sp.pr as 'home' | 'draw' | 'away' | undefined

  const hasScore = actualHome != null && actualAway != null
  const predLabel = predHome != null && predAway != null
    ? `${predHome} – ${predAway}`
    : predResult === 'home' ? `${home} win`
    : predResult === 'away' ? `${away} win`
    : predResult === 'draw' ? 'Draw'
    : null

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-pitch px-4 py-8">
      <div className="w-full max-w-sm">

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface-1 p-6">
          {perfect && (
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-goal/5" aria-hidden />
          )}

          <p className="mb-5 text-xs font-black uppercase tracking-[0.2em] text-fg-3">predictr</p>

          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-fg-3">🏆 World Cup 2026</p>
            <p className="mt-1 text-2xl font-black tracking-tight text-fg-1">
              {home}
              <span className="mx-2 text-fg-3">vs</span>
              {away}
            </p>
          </div>

          {hasScore && (
            <div className="mb-4 flex items-center gap-3">
              <span className="font-mono text-5xl font-black text-fg-1">{actualHome}</span>
              <span className="text-2xl text-fg-3">–</span>
              <span className="font-mono text-5xl font-black text-fg-1">{actualAway}</span>
            </div>
          )}

          <div className="mb-4 h-px bg-border" />

          <div className="mb-4">
            {perfect ? (
              <p className="mb-1 text-base font-black text-goal">🎯 Perfect score!</p>
            ) : pts > 0 ? (
              <p className="mb-1 text-base font-black text-goal">✅ Called it!</p>
            ) : (
              <p className="mb-1 text-base font-bold text-fg-3">❌ Missed this one</p>
            )}
            <p className="text-sm text-fg-3">
              <span className="font-black text-fg-1">{user}</span> predicted
              {predLabel
                ? <span className="ml-1 font-black text-fg-1">{predLabel}</span>
                : ' this match'}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className={`rounded-full px-4 py-1.5 font-mono text-base font-black ${
              pts > 0 ? 'bg-goal/10 text-goal' : 'bg-surface-2 text-fg-3'
            }`}>
              +{pts} pts
            </span>
            <p className="text-xs text-fg-3">predictr.app</p>
          </div>
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/tournaments"
            className="inline-block rounded-xl bg-fg-1 px-6 py-3 text-sm font-black text-pitch transition hover:opacity-90 active:scale-95"
          >
            Make your own predictions →
          </Link>
          <p className="mt-3 text-xs text-fg-3">Free to play · World Cup 2026</p>
        </div>

      </div>
    </main>
  )
}
