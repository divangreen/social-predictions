import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { WC2026_GROUPS, WC_TOURNAMENT_ID } from '@/lib/wc2026-groups'
import type { KnockoutPicks } from '@/lib/wc2026-bracket'

type Props = { params: Promise<{ username: string }> }

async function getData(username: string) {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('users')
    .select('id, username')
    .eq('username', username)
    .single()

  if (!profile) return null

  const [{ data: groupRows }, { data: knockoutRow }] = await Promise.all([
    supabase
      .from('bracket_predictions')
      .select('group_letter, first_place, second_place, points_earned')
      .eq('user_id', profile.id)
      .eq('tournament_id', WC_TOURNAMENT_ID),
    supabase
      .from('knockout_picks')
      .select('picks')
      .eq('user_id', profile.id)
      .eq('tournament_id', WC_TOURNAMENT_ID)
      .single(),
  ])

  const groupPicks = new Map((groupRows ?? []).map(r => [r.group_letter, r]))
  const knockoutPicks = knockoutRow?.picks as unknown as KnockoutPicks | null

  return { profile, groupPicks, knockoutPicks }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const data = await getData(username)
  if (!data) return { title: 'Not found' }

  const champion = data.knockoutPicks?.champion ?? null
  const groupCount = data.groupPicks.size
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://social-predictions.vercel.app'

  const ogParams = new URLSearchParams({ u: username, groups: String(groupCount) })
  if (champion) ogParams.set('champion', champion)

  const title = champion
    ? `${username} picks ${champion} to win the World Cup`
    : `${username}'s WC 2026 bracket — ${groupCount}/12 groups picked`

  return {
    title,
    description: 'Make your own World Cup predictions on predictr.',
    openGraph: {
      title,
      description: 'Make your own World Cup predictions on predictr.',
      images: [`${siteUrl}/api/og/bracket?${ogParams.toString()}`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      images: [`${siteUrl}/api/og/bracket?${ogParams.toString()}`],
    },
  }
}

export default async function PublicBracketPage({ params }: Props) {
  const { username } = await params
  const data = await getData(username)
  if (!data) notFound()

  const { profile, groupPicks, knockoutPicks } = data
  const champion = knockoutPicks?.champion ?? null
  const sfPicks = knockoutPicks?.sf ?? []

  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="mx-auto max-w-lg">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-2xl font-black text-white mx-auto">
            {profile.username[0]?.toUpperCase()}
          </div>
          <h1 className="text-xl font-black text-white">{profile.username}&apos;s WC 2026 picks</h1>
          <p className="text-sm text-zinc-500">FIFA World Cup 2026</p>
        </div>

        {/* Champion */}
        {champion && (
          <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-6 text-center">
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-yellow-600">Champion pick</p>
            <p className="text-3xl font-black text-white">{champion}</p>
          </div>
        )}

        {/* Semi-finalists */}
        {sfPicks.filter(Boolean).length > 0 && (
          <div className="mb-6">
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">Semi-finalists</p>
            <div className="grid grid-cols-2 gap-2">
              {sfPicks.filter(Boolean).map((team, i) => (
                <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-center">
                  <p className="font-bold text-white text-sm">{team}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Group picks */}
        {groupPicks.size > 0 && (
          <div className="mb-8">
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">
              Group picks ({groupPicks.size}/12)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {WC2026_GROUPS.map(group => {
                const pick = groupPicks.get(group.letter)
                if (!pick) return null
                return (
                  <div key={group.letter} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-zinc-600">Group {group.letter}</p>
                    <p className="text-xs font-bold text-white truncate">1. {pick.first_place}</p>
                    <p className="text-xs text-zinc-400 truncate">2. {pick.second_place}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6 text-center">
          <p className="mb-1 font-black text-white">Think you can beat {profile.username}?</p>
          <p className="mb-4 text-sm text-zinc-400">Submit your own bracket before June 11.</p>
          <Link
            href="/world-cup/bracket"
            className="inline-block w-full rounded-xl bg-white py-3 text-sm font-black text-black transition hover:bg-zinc-200"
          >
            Make my picks →
          </Link>
        </div>

      </div>
    </main>
  )
}
