'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function createLeague(formData: FormData) {
  const name = formData.get('name') as string
  const tournamentId = formData.get('tournament_id') as string

  if (!name?.trim() || !tournamentId) {
    redirect('/leagues/new?error=missing_fields')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const invite_code = generateInviteCode()

  const { data: league, error } = await supabase
    .from('leagues')
    .insert({ name: name.trim(), tournament_id: tournamentId, created_by: user.id, invite_code })
    .select()
    .single()

  if (error || !league) {
    redirect('/leagues/new?error=create_failed')
  }

  await supabase.from('league_members').insert({ league_id: league.id, user_id: user.id })

  redirect(`/leagues/${league.id}`)
}
