import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import OnboardingClient from './_components/OnboardingClient'
import { WC_TOURNAMENT_ID } from '@/lib/wc2026-groups'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single()

  const { step, error } = await searchParams
  const stepNum = step === '2' ? 2 : 1
  const initialUsername = profile?.username ?? user.email?.split('@')[0] ?? ''

  return (
    <OnboardingClient
      initialUsername={initialUsername}
      step={stepNum}
      error={error ?? null}
      wcTournamentId={WC_TOURNAMENT_ID}
    />
  )
}
