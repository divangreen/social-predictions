'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

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

  // Check uniqueness
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

  redirect(next)
}
