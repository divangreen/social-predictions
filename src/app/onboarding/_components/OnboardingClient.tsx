'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { saveUsername } from '../actions'

const USERNAME_ERRORS: Record<string, string> = {
  invalid_username: 'Username must be 2–20 characters.',
  invalid_chars: 'Only letters, numbers and underscores.',
  taken: 'That username is taken. Try another.',
  save_failed: 'Something went wrong. Try again.',
}

export default function OnboardingClient({
  initialUsername,
  step,
  error,
  wcTournamentId,
}: {
  initialUsername: string
  step: number
  error: string | null
  wcTournamentId: string
}) {
  const [username, setUsername] = useState(initialUsername)
  const [isPending, startTransition] = useTransition()

  if (step === 2) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6">
        <div className="w-full max-w-sm space-y-6">

          <div className="text-center">
            <div className="mb-3 text-4xl">🎉</div>
            <h1 className="text-2xl font-black text-white">You&apos;re in!</h1>
            <p className="mt-1 text-sm text-zinc-400">One more thing — pick your battles.</p>
          </div>

          {/* WC pick CTA */}
          <Link
            href={`/tournaments/${wcTournamentId}`}
            className="flex items-center justify-between rounded-2xl border-2 border-white bg-zinc-900 px-5 py-4 transition hover:bg-zinc-800 active:scale-[0.98]"
          >
            <div>
              <p className="font-black text-white">World Cup 2026</p>
              <p className="text-xs text-zinc-400">Pick your champion + bracket</p>
            </div>
            <span className="text-2xl">⚽</span>
          </Link>

          {/* Create league */}
          <Link
            href="/leagues/new"
            className="flex items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-4 transition hover:border-zinc-500 active:scale-[0.98]"
          >
            <div>
              <p className="font-bold text-white">Create a league</p>
              <p className="text-xs text-zinc-500">Invite your mates</p>
            </div>
            <span className="text-zinc-400">→</span>
          </Link>

          {/* Join league */}
          <Link
            href="/join"
            className="flex items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-4 transition hover:border-zinc-500 active:scale-[0.98]"
          >
            <div>
              <p className="font-bold text-white">Join with invite code</p>
              <p className="text-xs text-zinc-500">Got a link from a friend?</p>
            </div>
            <span className="text-zinc-400">→</span>
          </Link>

          <Link
            href="/tournaments"
            className="block text-center text-sm text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
          >
            Skip for now
          </Link>

        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6">
      <div className="w-full max-w-sm space-y-8">

        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight text-white">predictr</h1>
          <p className="mt-2 text-sm text-zinc-400">Predict. Compete. Brag.</p>
        </div>

        <div>
          <h2 className="mb-1 text-lg font-black text-white">Pick your username</h2>
          <p className="mb-5 text-sm text-zinc-500">This is how your mates will see you on the leaderboard.</p>

          <form
            action={(formData) => {
              startTransition(() => saveUsername(formData))
            }}
            className="space-y-4"
          >
            <input type="hidden" name="next" value="/onboarding?step=2" />
            <div>
              <input
                name="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                maxLength={20}
                placeholder="e.g. divan_fc"
                autoFocus
                autoComplete="off"
                autoCapitalize="off"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-600 outline-none transition focus:border-white"
              />
              <p className="mt-1.5 text-xs text-zinc-600">Letters, numbers and underscores only · 2–20 chars</p>
            </div>

            {error && (
              <p className="text-sm text-red-400">{USERNAME_ERRORS[error] ?? 'Something went wrong.'}</p>
            )}

            <button
              type="submit"
              disabled={isPending || username.trim().length < 2}
              className="w-full rounded-xl bg-white py-3 text-sm font-black text-black transition hover:bg-zinc-200 disabled:opacity-40"
            >
              {isPending ? 'Saving…' : 'Confirm username →'}
            </button>
          </form>
        </div>

      </div>
    </main>
  )
}
