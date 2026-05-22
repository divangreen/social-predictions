import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import LoginForm from './_components/LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/tournaments')

  const { error, next } = await searchParams

  let joinLeagueName: string | null = null
  if (next?.startsWith('/join/')) {
    const code = next.replace('/join/', '').split('?')[0].toUpperCase()
    if (code.length >= 4) {
      const { data } = await supabase.from('leagues').select('name').eq('invite_code', code).single()
      joinLeagueName = data?.name ?? null
    }
  }

  return <LoginForm urlError={error ?? null} next={next ?? null} joinLeagueName={joinLeagueName} />
}
