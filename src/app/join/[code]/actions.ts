'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export async function joinLeague(leagueId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Idempotent — ignore if already a member
  await supabase
    .from('league_members')
    .upsert({ league_id: leagueId, user_id: user.id }, { onConflict: 'league_id,user_id', ignoreDuplicates: true })

  redirect(`/leagues/${leagueId}`)
}
