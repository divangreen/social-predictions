import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { WC_LOCK_DATE, WC_TOURNAMENT_ID } from '@/lib/wc2026-groups'
import { emptyKnockoutPicks, type KnockoutPicks } from '@/lib/wc2026-bracket'
import KnockoutBracket from './KnockoutBracket'
import ShareBracketButton from '../_components/ShareBracketButton'

function daysUntil(date: Date) {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000))
}

export default async function WCKnockoutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locked = new Date() >= WC_LOCK_DATE
  const daysLeft = daysUntil(WC_LOCK_DATE)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://social-predictions.vercel.app'

  const [{ data: groupRows }, { data: knockoutRow }, { data: profile }] = await Promise.all([
    supabase
      .from('bracket_predictions')
      .select('group_letter, first_place, second_place')
      .eq('user_id', user.id)
      .eq('tournament_id', WC_TOURNAMENT_ID),
    supabase
      .from('knockout_picks')
      .select('picks')
      .eq('user_id', user.id)
      .eq('tournament_id', WC_TOURNAMENT_ID)
      .single(),
    supabase.from('users').select('username').eq('id', user.id).single(),
  ])

  const groupPicks = new Map(
    (groupRows ?? []).map(r => [r.group_letter, { first_place: r.first_place, second_place: r.second_place }])
  )

  const initial: KnockoutPicks = (knockoutRow?.picks as unknown as KnockoutPicks) ?? emptyKnockoutPicks()
  const username = profile?.username ?? user.email?.split('@')[0] ?? 'user'
  const hasKnockoutPicks = !!knockoutRow?.picks

  return (
    <main className="min-h-screen bg-pitch px-4 py-8">
      <div className="mx-auto max-w-lg">

        <div className="mb-4 flex items-center justify-between">
          <Link href="/world-cup/bracket" className="inline-flex items-center gap-1 text-sm text-fg-3 hover:text-fg-1">
            ← Group Picks
          </Link>
          <Link href="/world-cup/leaderboard" className="text-sm font-bold text-fg-2 hover:text-fg-1 transition">
            Leaderboard →
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-black text-fg-1">Knockout Bracket</h1>
          <p className="mt-1 text-sm text-fg-3">
            Pick who advances through each round to the title.
          </p>
        </div>

        {locked ? (
          <div className="mb-6 rounded-2xl border border-border bg-surface-1 p-4 text-center">
            <p className="font-semibold text-fg-2">Picks are locked</p>
            <p className="text-sm text-fg-3">The tournament has started.</p>
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border border-border bg-surface-1 p-4 text-center">
            <p className="text-2xl font-black text-fg-1">{daysLeft}</p>
            <p className="text-sm text-fg-2">days to lock in your picks</p>
          </div>
        )}

        <KnockoutBracket
          groupPicks={groupPicks}
          initial={initial}
          locked={locked}
        />

        {hasKnockoutPicks && (
          <div className="mt-4 pb-8">
            <ShareBracketButton username={username} siteUrl={siteUrl} />
          </div>
        )}

      </div>
    </main>
  )
}
