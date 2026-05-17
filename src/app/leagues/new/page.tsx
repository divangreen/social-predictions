import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { createLeague } from './actions'
import Link from 'next/link'

export default async function NewLeaguePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name')
    .in('status', ['upcoming', 'active'])
    .order('name')

  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="mx-auto max-w-lg">
        <Link href="/tournaments" className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300">
          ← Back
        </Link>

        <h1 className="mb-1 text-2xl font-black tracking-tight text-white">Create a league</h1>
        <p className="mb-8 text-sm text-zinc-500">Invite your mates and see who predicts best.</p>

        <form action={createLeague} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-zinc-300">
              League name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Office Legends"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 outline-none transition focus:border-zinc-400"
            />
          </div>

          <div>
            <label htmlFor="tournament_id" className="mb-1.5 block text-sm font-medium text-zinc-300">
              Tournament
            </label>
            <select
              id="tournament_id"
              name="tournament_id"
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-zinc-400"
            >
              <option value="">Select a tournament…</option>
              {tournaments?.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Create league
          </button>
        </form>
      </div>
    </main>
  )
}
