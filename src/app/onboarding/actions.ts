'use server'

import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const PENDING_INVITE_COOKIE = 'pending_invite'

export async function saveUsername(formData: FormData) {
  const username = (formData.get('username') as string)?.trim()
  const next = (formData.get('next') as string) || '/onboarding?step=2'

  if (!username || username.length < 2 || username.length > 20) {
    redirect(`/onboarding?error=invalid_username`)
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    redirect(`/onboarding?error=invalid_chars`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .neq('id', user.id)
    .single()

  if (existing) redirect(`/onboarding?error=taken`)

  const { error } = await supabase
    .from('users')
    .update({ username })
    .eq('id', user.id)

  if (error) redirect(`/onboarding?error=save_failed`)

  // Auto-join league if an invite was pending from the auth flow
  const cookieStore = await cookies()
  const inviteCode = cookieStore.get(PENDING_INVITE_COOKIE)?.value
  if (inviteCode) {
    cookieStore.delete(PENDING_INVITE_COOKIE)
    const { data: league } = await supabase
      .from('leagues')
      .select('id')
      .eq('invite_code', inviteCode)
      .single()

    if (league) {
      await supabase
        .from('league_members')
        .upsert({ league_id: league.id, user_id: user.id }, { onConflict: 'league_id,user_id', ignoreDuplicates: true })
      redirect(`/leagues/${league.id}`)
    }
  }

  redirect(next)
}
