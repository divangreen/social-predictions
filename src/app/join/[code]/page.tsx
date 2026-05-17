import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { joinLeague } from './actions'

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/join/${code}`)

  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, tournament_id')
    .eq('invite_code', code.toUpperCase())
    .single()

  if (!league) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6">
        <div className="text-center">
          <p className="text-4xl">🤔</p>
          <h1 className="mt-4 text-xl font-bold text-white">Invalid invite link</h1>
          <p className="mt-2 text-sm text-zinc-400">This league doesn't exist or the link has expired.</p>
        </div>
      </main>
    )
  }

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('name')
    .eq('id', league.tournament_id)
    .single()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <p className="text-5xl">🏆</p>
        <div>
          <h1 className="text-2xl font-black text-white">{league.name}</h1>
          {tournament?.name && (
            <p className="mt-1 text-sm text-zinc-400">{tournament.name}</p>
          )}
        </div>
        <p className="text-sm text-zinc-400">You've been invited to join this prediction league.</p>

        <form action={joinLeague.bind(null, league.id)}>
          <button
            type="submit"
            className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Join league
          </button>
        </form>
      </div>
    </main>
  )
}
