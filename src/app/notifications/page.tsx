import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-pitch px-4 py-8">
      <div className="mx-auto max-w-lg">

        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-tight text-fg-1">Notifications</h1>
          <p className="mt-1 text-sm text-fg-3">Stay on top of your leagues and picks.</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-1 p-10 text-center">
          <p className="mb-1 text-3xl">🔔</p>
          <p className="mb-1 font-bold text-fg-1">Nothing here yet</p>
          <p className="text-sm text-fg-3">
            You&apos;ll be notified when league mates join, matches are scored, and more.
          </p>
        </div>

      </div>
    </main>
  )
}
