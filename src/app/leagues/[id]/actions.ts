'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function assertAdmin(leagueId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: league } = await supabase
    .from('leagues')
    .select('created_by')
    .eq('id', leagueId)
    .single()

  if (!league || league.created_by !== user.id) {
    throw new Error('Not authorised')
  }

  return { supabase, userId: user.id }
}

export async function deleteLeague(leagueId: string) {
  const { supabase } = await assertAdmin(leagueId)

  await supabase.from('league_members').delete().eq('league_id', leagueId)
  await supabase.from('leagues').delete().eq('id', leagueId)

  redirect('/tournaments')
}

export async function removeMember(leagueId: string, targetUserId: string): Promise<{ error: string } | void> {
  const { userId, supabase } = await assertAdmin(leagueId)

  if (targetUserId === userId) return { error: 'Cannot remove yourself' }

  await supabase
    .from('league_members')
    .delete()
    .eq('league_id', leagueId)
    .eq('user_id', targetUserId)

  revalidatePath(`/leagues/${leagueId}`)
}

export async function renameLeague(leagueId: string, name: string): Promise<{ error: string } | void> {
  const { supabase } = await assertAdmin(leagueId)

  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name cannot be empty' }

  await supabase.from('leagues').update({ name: trimmed }).eq('id', leagueId)

  revalidatePath(`/leagues/${leagueId}`)
}

export async function regenerateInvite(leagueId: string): Promise<void> {
  const { supabase } = await assertAdmin(leagueId)

  // Math.random is sufficient here — invite codes are 6-char convenience links,
  // not security tokens; a proper CSPRNG would be overkill.
  const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase()
  await supabase.from('leagues').update({ invite_code }).eq('id', leagueId)

  revalidatePath(`/leagues/${leagueId}`)
}
