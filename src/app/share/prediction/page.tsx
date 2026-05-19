import type { Metadata } from 'next'
import Link from 'next/link'

type Props = { searchParams: Promise<Record<string, string>> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const p = await searchParams
  const home    = p.home ?? 'Home'
  const away    = p.away ?? 'Away'
  const hs      = p.hs   ?? '?'
  const as_     = p.as   ?? '?'
  const perfect = p.p === '1'
  const pts     = p.pts ?? '0'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const ogParams = new URLSearchParams(p).toString()
  const title = perfect
    ? `🎯 Perfect score prediction! ${home} ${hs}–${as_} ${away}`
    : `I picked ${home} ${hs}–${as_} ${away} on predictr (+${pts} pts)`

  return {
    title,
    description: 'Make your own predictions on predictr — the social sports prediction app.',
    openGraph: {
      title,
      description: 'Predict scores, beat your mates. Join predictr.',
      images: [`${siteUrl}/api/og?${ogParams}`],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      images: [`${siteUrl}/api/og?${ogParams}`],
    },
  }
}

export default async function SharePredictionPage({ searchParams }: Props) {
  const p = await searchParams
  const home    = p.home ?? 'Home'
  const away    = p.away ?? 'Away'
  const hs      = p.hs   ?? '?'
  const as_     = p.as   ?? '?'
  const username = p.u   ?? 'Someone'
  const pts     = Number(p.pts ?? 0)
  const perfect = p.p === '1'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-4 py-8">
      <div className="w-full max-w-sm">

        {/* Card */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <div className="h-1 bg-white" />
          <div className="flex flex-col items-center px-6 py-8 text-center">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">predictr</p>

            <p className="mb-4 text-base font-semibold text-zinc-400">
              {home} <span className="text-zinc-600">vs</span> {away}
            </p>

            <div className="mb-4 flex items-center gap-4">
              <span className="max-w-20 truncate text-7xl font-black text-white">{hs}</span>
              <span className="text-4xl font-black text-zinc-600">–</span>
              <span className="max-w-20 truncate text-7xl font-black text-white">{as_}</span>
            </div>

            <p className={`mb-1 text-lg font-bold ${perfect ? 'text-green-400' : pts > 0 ? 'text-green-400' : 'text-zinc-500'}`}>
              {perfect ? '🎯 Perfect score!' : pts > 0 ? `✅ +${pts} pts` : '✗ Missed'}
            </p>
            <p className="text-sm text-zinc-500">{username}'s prediction</p>
          </div>
          <div className="h-1 bg-white" />
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="mb-4 text-sm text-zinc-400">Think you can do better?</p>
          <Link
            href={`${siteUrl}/login`}
            className="inline-block w-full rounded-2xl bg-white py-3 text-center text-sm font-bold text-black transition hover:bg-zinc-200"
          >
            Join predictr →
          </Link>
        </div>

      </div>
    </main>
  )
}
