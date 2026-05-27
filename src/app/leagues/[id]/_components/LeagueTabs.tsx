'use client'

import { useState } from 'react'

export interface MemberDisplay {
  userId: string
  username: string
  avatarUrl: string | null
  isAdmin: boolean
}

function MembersList({ members, currentUserId }: { members: MemberDisplay[]; currentUserId: string }) {
  return (
    <div className="space-y-2">
      {members.map(m => (
        <div
          key={m.userId}
          className="flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            {m.avatarUrl ? (
              <img src={m.avatarUrl} alt={m.username} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-fg-1">
                {m.username[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-fg-1">
                {m.username}
                {m.userId === currentUserId && <span className="ml-1 text-xs text-fg-3">(you)</span>}
              </p>
              {m.isAdmin && <p className="text-[10px] font-bold text-gold">Admin</p>}
            </div>
          </div>
          <span className="rounded-full bg-goal/10 px-2.5 py-1 text-[10px] font-black text-goal">
            Member
          </span>
        </div>
      ))}
      {members.length === 0 && (
        <p className="py-8 text-center text-sm text-fg-3">No members yet.</p>
      )}
    </div>
  )
}

export function LeagueTabs({
  leaderboard,
  feed,
  feedCount,
  members,
  currentUserId,
}: {
  leaderboard: React.ReactNode
  feed: React.ReactNode
  feedCount: number
  members: MemberDisplay[]
  currentUserId: string
}) {
  const [tab, setTab] = useState<'standings' | 'feed' | 'members'>('standings')

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
        <button
          onClick={() => setTab('members')}
          className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider transition ${
            tab === 'members'
              ? 'border-b-2 border-gold text-gold'
              : 'text-fg-3 hover:text-fg-2'
          }`}
        >
          Members
          <span className="ml-1.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] font-black text-fg-3">
            {members.length}
          </span>
        </button>
      </div>

      {tab === 'standings' && leaderboard}
      {tab === 'feed' && feed}
      {tab === 'members' && <MembersList members={members} currentUserId={currentUserId} />}
    </div>
  )
}
