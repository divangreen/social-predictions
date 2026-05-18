import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { createLeague } from './actions'
import Link from 'next/link'

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: 'Please fill in all fields.',
  create_failed: 'Something went wrong. Try again.',
}

export default async function NewLeaguePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await searchParams

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name')
    .in('status', ['upcoming', 'active'])
    .order('name')

  return (
    <main className="min-h-screen bg-pitch px-4 py-8">
      <div className="mx-auto max-w-lg">
        <Link href="/tournaments" className="mb-6 inline-flex items-center gap-1 text-sm text-fg-3 transition hover:text-fg-2">
          ← Back
        </Link>

        <h1 className="mb-1 mt-4 text-2xl font-black tracking-tight text-fg-1">Create a league</h1>
        <p className="mb-8 text-sm text-fg-3">Invite your mates and see who predicts best.</p>

        {error && (
          <p className="mb-4 rounded-xl bg-live/10 px-4 py-3 text-sm text-live">
            {ERROR_MESSAGES[error] ?? 'Something went wrong.'}
          </p>
        )}

        <form action={createLeague} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-bold text-fg-2">
              League name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Office Legends"
              className="w-full rounded-xl border border-border bg-surface-1 px-4 py-3 text-fg-1 placeholder-fg-3 outline-none transition focus:border-fg-2"
            />
          </div>

          <div>
            <label htmlFor="tournament_id" className="mb-1.5 block text-sm font-bold text-fg-2">
              Tournament
            </label>
            <select
              id="tournament_id"
              name="tournament_id"
              required
              className="w-full rounded-xl border border-border bg-surface-1 px-4 py-3 text-fg-1 outline-none transition focus:border-fg-2"
            >
              <option value="">Select a tournament…</option>
              {tournaments?.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-fg-1 py-3 text-sm font-bold text-pitch transition hover:opacity-90 active:scale-[0.98]"
          >
            Create league
          </button>
        </form>
      </div>
    </main>
  )
}
