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
    <main className="flex min-h-screen flex-col items-center justify-center bg-pitch px-6">
      <div className="w-full max-w-sm space-y-8">

        <div className="text-center">
          <p className="text-4xl">🔗</p>
          <h1 className="mt-3 text-2xl font-black text-fg-1">Join a league</h1>
          <p className="mt-1 text-sm text-fg-3">Enter the invite code from your mate.</p>
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
            className="w-full rounded-xl border border-border bg-surface-1 px-4 py-3 text-center font-mono text-lg tracking-widest text-fg-1 placeholder-fg-3 outline-none transition focus:border-fg-2"
          />
          <button
            type="submit"
            disabled={code.trim().length < 4}
            className="w-full rounded-xl bg-fg-1 py-3 text-sm font-black text-pitch transition hover:opacity-90 disabled:opacity-40"
          >
            Find league →
          </button>
        </form>

        <p className="text-center text-sm text-fg-3">
          Don&apos;t have a code?{' '}
          <Link href="/leagues/new" className="text-fg-2 underline underline-offset-2 hover:text-fg-1">
            Create your own league
          </Link>
        </p>

      </div>
    </main>
  )
}
