'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface League {
  id: string
  name: string
}

interface Props {
  currentLeagueId: string
  leagues: League[]
}

export function LeagueSwitcher({ currentLeagueId, leagues }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = leagues.find(l => l.id === currentLeagueId)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (leagues.length <= 1) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-1.5 text-xs font-bold text-fg-2 transition hover:border-fg-3 hover:text-fg-1"
      >
        <span className="max-w-[120px] truncate">{current?.name ?? 'Leagues'}</span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-xl">
          {leagues.map(league => (
            <button
              key={league.id}
              onClick={() => {
                setOpen(false)
                if (league.id !== currentLeagueId) {
                  router.push(`/leagues/${league.id}`)
                }
              }}
              className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition hover:bg-surface-2 ${
                league.id === currentLeagueId ? 'font-bold text-fg-1' : 'text-fg-2'
              }`}
            >
              <span className="truncate">{league.name}</span>
              {league.id === currentLeagueId && (
                <span className="ml-2 shrink-0 text-[10px] font-black text-gold">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
