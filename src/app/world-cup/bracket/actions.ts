'use server'

import { createClient } from '@/lib/supabase-server'
import { WC_LOCK_DATE, WC_TOURNAMENT_ID } from '@/lib/wc2026-groups'
import { redirect } from 'next/navigation'

export async function saveBracketPicks(formData: FormData) {
  if (new Date() >= WC_LOCK_DATE) {
    redirect('/world-cup/bracket?error=locked')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const letters = ['A','B','C','D','E','F','G','H','I','J','K','L']
  const rows = letters.map(letter => ({
    user_id: user.id,
    tournament_id: WC_TOURNAMENT_ID,
    group_letter: letter,
    first_place: formData.get(`first_${letter}`) as string ?? '',
    second_place: formData.get(`second_${letter}`) as string ?? '',
  })).filter(r => r.first_place && r.second_place && r.first_place !== r.second_place)

  if (!rows.length) redirect('/world-cup/bracket?error=invalid')

  const { error } = await supabase
    .from('bracket_predictions')
    .upsert(rows, { onConflict: 'user_id,tournament_id,group_letter' })

  if (error) redirect('/world-cup/bracket?error=save_failed')
  redirect('/world-cup/bracket?saved=1')
}
