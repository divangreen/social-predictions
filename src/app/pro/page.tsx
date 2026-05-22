import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const PRO_FEATURES = [
  { icon: '🏆', title: 'League leaderboard history', desc: 'See how your rank has changed week by week' },
  { icon: '🧬', title: 'Deep prediction DNA', desc: 'Full accuracy breakdown by team, stage, and result' },
  { icon: '🌍', title: 'Global percentile badge', desc: 'Show your "Top X%" rank on your profile' },
  { icon: '📊', title: 'Head-to-head stats', desc: 'Compare your picks against any league member' },
  { icon: '⚡', title: 'Early access', desc: 'First access to new features before public launch' },
]

export default async function ProPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-pitch px-4 py-8">
      <div className="mx-auto max-w-lg">

        <div className="mb-6">
          <Link href="/profile" className="text-sm text-fg-3 transition hover:text-fg-2">
            ← Profile
          </Link>
        </div>

        <div className="mb-6 rounded-2xl border-2 border-fg-1 bg-surface-1 p-6 text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-fg-3">predictr</p>
          <p className="mt-1 text-3xl font-black text-fg-1">Pro</p>
          <p className="mt-3 text-sm font-bold text-fg-3">Coming soon</p>
          <p className="mt-1 text-xs text-fg-3">
            Pro features are on the way. You&apos;ll be notified when subscriptions open.
          </p>
        </div>

        <div className="space-y-2">
          {PRO_FEATURES.map(f => (
            <div key={f.title} className="flex items-start gap-3 rounded-2xl border border-border bg-surface-1 px-4 py-4">
              <span className="text-xl">{f.icon}</span>
              <div>
                <p className="text-sm font-black text-fg-1">{f.title}</p>
                <p className="text-xs text-fg-3">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  )
}
