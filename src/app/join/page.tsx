'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

export default function JoinPage() {
  const [code, setCode] = useState('')
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length >= 4) router.push(`/join/${trimmed}`)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6">
      <div className="w-full max-w-sm space-y-8">

        <div className="text-center">
          <p className="text-4xl">🔗</p>
          <h1 className="mt-3 text-2xl font-black text-white">Join a league</h1>
          <p className="mt-1 text-sm text-zinc-400">Enter the invite code from your mate.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. AB12CD"
            maxLength={10}
            autoFocus
            autoCapitalize="characters"
            autoComplete="off"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center font-mono text-lg tracking-widest text-white placeholder-zinc-600 outline-none transition focus:border-white"
          />
          <button
            type="submit"
            disabled={code.trim().length < 4}
            className="w-full rounded-xl bg-white py-3 text-sm font-black text-black transition hover:bg-zinc-200 disabled:opacity-40"
          >
            Find league →
          </button>
        </form>

        <p className="text-center text-sm text-zinc-600">
          Don&apos;t have a code?{' '}
          <Link href="/leagues/new" className="text-zinc-400 underline underline-offset-2 hover:text-white">
            Create your own league
          </Link>
        </p>

      </div>
    </main>
  )
}
