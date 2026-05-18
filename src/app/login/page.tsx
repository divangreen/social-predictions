import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import LoginForm from './_components/LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/tournaments')

  const { error } = await searchParams
  return <LoginForm urlError={error ?? null} />
}
