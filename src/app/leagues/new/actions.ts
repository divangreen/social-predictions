'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function createLeague(formData: FormData) {
  const name = formData.get('name') as string
  const tournamentId = formData.get('tournament_id') as string

  if (!name?.trim() || !tournamentId) return { error: 'Missing fields' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const invite_code = generateInviteCode()

  const { data: league, error } = await supabase
    .from('leagues')
    .insert({ name: name.trim(), tournament_id: tournamentId, created_by: user.id, invite_code })
    .select()
    .single()

  if (error || !league) return { error: error?.message ?? 'Failed to create league' }

  // Auto-join creator
  await supabase.from('league_members').insert({ league_id: league.id, user_id: user.id })

  redirect(`/leagues/${league.id}`)
}
