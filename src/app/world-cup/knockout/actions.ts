'use server'

import { createClient } from '@/lib/supabase-server'
import { WC_LOCK_DATE, WC_TOURNAMENT_ID } from '@/lib/wc2026-groups'
import type { KnockoutPicks } from '@/lib/wc2026-bracket'
import { redirect } from 'next/navigation'
import { emptyKnockoutPicks } from '@/lib/wc2026-bracket'

export async function saveKnockoutPicks(picks: KnockoutPicks) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (new Date() >= WC_LOCK_DATE) {
    return { error: 'locked' }
  }

  const { error } = await supabase
    .from('knockout_picks')
    .upsert(
      {
        user_id: user.id,
        tournament_id: WC_TOURNAMENT_ID,
        picks: picks as unknown as Record<string, unknown>,
      },
      { onConflict: 'user_id,tournament_id' }
    )

  if (error) return { error: 'save_failed' }
  return { success: true }
}

export async function saveChampionPick(formData: FormData) {
  const redirectTo = (formData.get('redirect_to') as string) || `/tournaments/${WC_TOURNAMENT_ID}`

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (new Date() >= WC_LOCK_DATE) redirect(`${redirectTo}?error=locked`)

  const champion = formData.get('champion') as string
  if (!champion) redirect(`${redirectTo}?error=no_champion`)

  const { data: existing } = await supabase
    .from('knockout_picks')
    .select('picks')
    .eq('user_id', user.id)
    .eq('tournament_id', WC_TOURNAMENT_ID)
    .single()

  const currentPicks: KnockoutPicks = (existing?.picks as unknown as KnockoutPicks) ?? emptyKnockoutPicks()
  currentPicks.champion = champion

  const { error } = await supabase
    .from('knockout_picks')
    .upsert(
      { user_id: user.id, tournament_id: WC_TOURNAMENT_ID, picks: currentPicks as unknown as Record<string, unknown> },
      { onConflict: 'user_id,tournament_id' }
    )

  if (error) redirect(`${redirectTo}?error=save_failed`)
  redirect(`${redirectTo}?saved_champion=1`)
}

export async function saveTopScorerPick(formData: FormData) {
  const redirectTo = (formData.get('redirect_to') as string) || `/tournaments/${WC_TOURNAMENT_ID}`

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (new Date() >= WC_LOCK_DATE) redirect(`${redirectTo}?error=locked`)

  const topScorer = formData.get('top_scorer') as string
  if (!topScorer) redirect(`${redirectTo}?error=no_top_scorer`)

  const { data: existing } = await supabase
    .from('knockout_picks')
    .select('picks')
    .eq('user_id', user.id)
    .eq('tournament_id', WC_TOURNAMENT_ID)
    .single()

  const currentPicks: KnockoutPicks = (existing?.picks as unknown as KnockoutPicks) ?? emptyKnockoutPicks()
  currentPicks.topScorer = topScorer

  const { error } = await supabase
    .from('knockout_picks')
    .upsert(
      { user_id: user.id, tournament_id: WC_TOURNAMENT_ID, picks: currentPicks as unknown as Record<string, unknown> },
      { onConflict: 'user_id,tournament_id' }
    )

  if (error) redirect(`${redirectTo}?error=save_failed`)
  redirect(`${redirectTo}?saved_top_scorer=1`)
}
