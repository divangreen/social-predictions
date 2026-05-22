import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProUpgradeButton } from './_components/ProUpgradeButton'

const PRO_FEATURES = [
  { icon: '🏆', title: 'League leaderboard history', desc: 'See how your rank has changed week by week' },
  { icon: '🧬', title: 'Deep prediction DNA', desc: 'Full accuracy breakdown by team, stage, and result' },
  { icon: '🌍', title: 'Global percentile badge', desc: 'Show your "Top X%" rank on your profile' },
  { icon: '📊', title: 'Head-to-head stats', desc: 'Compare your picks against any league member' },
  { icon: '⚡', title: 'Early access', desc: 'First access to new features before public launch' },
]

export default async function ProPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('username, is_pro' as 'username')
    .eq('id', user.id)
    .single()

  const isPro = (profile as { username: string; is_pro?: boolean } | null)?.is_pro ?? false
  const username = (profile as { username: string } | null)?.username ?? 'predictor'

  return (
    <main className="min-h-screen bg-pitch px-4 py-8">
      <div className="mx-auto max-w-lg">

        <div className="mb-6">
          <Link href="/profile" className="text-sm text-fg-3 transition hover:text-fg-2">
            ← Profile
          </Link>
        </div>

        {sp.success && (
          <div className="mb-6 rounded-2xl bg-goal/10 border border-goal/20 px-5 py-4 text-center">
            <p className="text-lg font-black text-goal">Welcome to Pro, {username}!</p>
            <p className="mt-1 text-sm text-fg-2">All Pro features are now unlocked.</p>
          </div>
        )}

        {isPro ? (
          <div className="mb-6 rounded-2xl border-2 border-gold bg-surface-1 p-6 text-center">
            <p className="text-3xl mb-2">🏆</p>
            <p className="text-xl font-black text-gold">predictr Pro</p>
            <p className="mt-1 text-sm text-fg-3">Active subscription</p>
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border-2 border-fg-1 bg-surface-1 p-6">
            <div className="mb-4 text-center">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-fg-3">predictr</p>
              <p className="mt-1 text-3xl font-black text-fg-1">Pro</p>
              <p className="mt-3 flex items-baseline justify-center gap-1">
                <span className="font-mono text-4xl font-black text-fg-1">£3</span>
                <span className="text-sm text-fg-3">/ month</span>
              </p>
              <p className="mt-1 text-xs text-fg-3">Cancel any time</p>
            </div>
            <ProUpgradeButton />
          </div>
        )}

        <div className="space-y-2">
          {PRO_FEATURES.map(f => (
            <div key={f.title} className="flex items-start gap-3 rounded-2xl border border-border bg-surface-1 px-4 py-4">
              <span className="text-xl">{f.icon}</span>
              <div>
                <p className="text-sm font-black text-fg-1">{f.title}</p>
                <p className="text-xs text-fg-3">{f.desc}</p>
              </div>
              {isPro && (
                <span className="ml-auto shrink-0 text-xs font-bold text-goal">Active</span>
              )}
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-fg-3">
          Secure checkout powered by Stripe · Instant activation
        </p>

      </div>
    </main>
  )
}
