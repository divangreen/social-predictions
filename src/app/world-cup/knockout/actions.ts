'use server'

import { createClient } from '@/lib/supabase-server'
import { WC_LOCK_DATE, WC_TOURNAMENT_ID } from '@/lib/wc2026-groups'
import type { KnockoutPicks } from '@/lib/wc2026-bracket'
import { redirect } from 'next/navigation'

export async function saveKnockoutPicks(picks: KnockoutPicks) {
  if (new Date() >= WC_LOCK_DATE) {
    return { error: 'locked' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
