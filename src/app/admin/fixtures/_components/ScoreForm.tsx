'use client'

import { useState } from 'react'
import { saveFixtureResult } from '../actions'
import type { Fixture } from '@/types/database'

export default function ScoreForm({ fixture, maxScore = 20 }: { fixture: Fixture; maxScore?: number }) {
  const [home, setHome] = useState(fixture.home_score ?? 0)
  const [away, setAway] = useState(fixture.away_score ?? 0)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const alreadyScored = fixture.status === 'completed'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    const result = await saveFixtureResult(fixture.id, home, away)
    if (result.error) {
      setMsg(result.error)
      setStatus('error')
    } else {
      setMsg(`Scored ${result.scored ?? 0} predictions`)
      setStatus('saved')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={maxScore}
          value={home}
          onChange={e => setHome(Number(e.target.value))}
          className="w-14 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-center text-white outline-none focus:border-zinc-400"
        />
        <span className="text-zinc-500">–</span>
        <input
          type="number"
          min={0}
          max={maxScore}
          value={away}
          onChange={e => setAway(Number(e.target.value))}
          className="w-14 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-center text-white outline-none focus:border-zinc-400"
        />
      </div>

      <button
        type="submit"
        disabled={status === 'saving'}
        className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
      >
        {status === 'saving' ? 'Saving…' : alreadyScored ? 'Re-score' : 'Set result'}
      </button>

      {status === 'saved' && <span className="text-xs text-green-400">✓ {msg}</span>}
      {status === 'error' && <span className="text-xs text-red-400">{msg}</span>}
    </form>
  )
}
