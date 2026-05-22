'use client'

import { useState } from 'react'

export function ProUpgradeButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpgrade() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error ?? 'Something went wrong')
        setLoading(false)
      }
    } catch {
      setError('Connection error. Try again.')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="w-full rounded-xl bg-fg-1 py-3.5 text-sm font-black text-pitch transition hover:opacity-90 active:scale-95 disabled:opacity-60"
      >
        {loading ? 'Redirecting to checkout…' : 'Upgrade to Pro →'}
      </button>
      {error && (
        <p className="mt-2 text-center text-xs text-loss">{error}</p>
      )}
    </div>
  )
}
