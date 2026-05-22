'use client'

import { useState } from 'react'

export function LeagueTabs({
  leaderboard,
  feed,
  feedCount,
}: {
  leaderboard: React.ReactNode
  feed: React.ReactNode
  feedCount: number
}) {
  const [tab, setTab] = useState<'standings' | 'feed'>('standings')

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-4 flex border-b border-border">
        <button
          onClick={() => setTab('standings')}
          className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider transition ${
            tab === 'standings'
              ? 'border-b-2 border-gold text-gold'
              : 'text-fg-3 hover:text-fg-2'
          }`}
        >
          Standings
        </button>
        <button
          onClick={() => setTab('feed')}
          className={`relative flex-1 py-2.5 text-xs font-black uppercase tracking-wider transition ${
            tab === 'feed'
              ? 'border-b-2 border-gold text-gold'
              : 'text-fg-3 hover:text-fg-2'
          }`}
        >
          Feed
          {feedCount > 0 && (
            <span className="ml-1.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] font-black text-fg-3">
              {feedCount}
            </span>
          )}
        </button>
      </div>

      {tab === 'standings' && leaderboard}
      {tab === 'feed' && feed}
    </div>
  )
}
