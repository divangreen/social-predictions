'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'

export type LeaderboardEntry = {
  userId: string
  username: string
  avatarUrl: string | null
  points: number
  predictionsMade: number
  perfectScores: number
}

function SeasonSummary({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length < 2) return null
  const totalPicks = entries.reduce((s, e) => s + e.predictionsMade, 0)
  const totalPerfect = entries.reduce((s, e) => s + e.perfectScores, 0)
  const leader = entries[0]
  const gap = entries.length > 1 ? leader.points - entries[1].points : null

  return (
    <div className="mb-3 grid grid-cols-3 gap-2">
      <div className="rounded-xl bg-surface-2 p-3 text-center">
        <p className="font-mono text-lg font-black text-fg-1">{totalPicks}</p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-fg-3">Total picks</p>
      </div>
      <div className="rounded-xl bg-surface-2 p-3 text-center">
        <p className="font-mono text-lg font-black text-goal">{totalPerfect}</p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-fg-3">Perfect</p>
      </div>
      <div className="rounded-xl bg-surface-2 p-3 text-center">
        <p className="font-mono text-lg font-black text-gold">{gap !== null ? `+${gap}` : '—'}</p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-fg-3">Leader gap</p>
      </div>
    </div>
  )
}

function Avatar({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={username} className="h-9 w-9 rounded-full object-cover" />
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-fg-1">
      {username[0]?.toUpperCase()}
    </div>
  )
}

export function RealtimeLeaderboard({
  initial,
  currentUserId,
  memberIds,
  tournamentId,
}: {
  initial: LeaderboardEntry[]
  currentUserId: string
  memberIds: string[]
  tournamentId: string
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initial)
  const [flashedUser, setFlashedUser] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    setEntries(initial)
  }, [initial])

  useEffect(() => {
    if (!memberIds.length) return

    const channel = supabase
      .channel('leaderboard-' + tournamentId)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'predictions' },
        async (payload) => {
          const updated = payload.new as { user_id: string; fixture_id: string; points_earned: number | null; is_perfect: boolean | null }
          if (!memberIds.includes(updated.user_id)) return

          // Re-fetch all predictions for this tournament's members to recompute leaderboard
          const { data: fixtures } = await supabase
            .from('fixtures')
            .select('id')
            .eq('tournament_id', tournamentId)

          if (!fixtures) return

          const fixtureSet = new Set(fixtures.map(f => f.id))
          const fixtureIds = Array.from(fixtureSet)

          const { data: predictions } = await supabase
            .from('predictions')
            .select('user_id, points_earned, is_perfect, fixture_id')
            .in('user_id', memberIds)
            .in('fixture_id', fixtureIds)

          if (!predictions) return
          const statsMap = new Map<string, { points: number; made: number; perfect: number }>()

          predictions
            .filter(p => fixtureSet.has(p.fixture_id))
            .forEach(p => {
              const s = statsMap.get(p.user_id) ?? { points: 0, made: 0, perfect: 0 }
              s.points += p.points_earned ?? 0
              s.made += 1
              if (p.is_perfect) s.perfect += 1
              statsMap.set(p.user_id, s)
            })

          setEntries(prev => {
            const next = prev.map(e => {
              const stats = statsMap.get(e.userId)
              if (!stats) return e
              return { ...e, points: stats.points, predictionsMade: stats.made, perfectScores: stats.perfect }
            }).sort((a, b) => b.points - a.points)
            return next
          })

          // Flash the user whose score changed
          setFlashedUser(updated.user_id)
          setTimeout(() => setFlashedUser(null), 1500)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [memberIds, tournamentId])

  return (
    <div>
      <SeasonSummary entries={entries} />
      <div className="space-y-2">
      <AnimatePresence initial={false}>
      {entries.map((entry, i) => {
        const rank = i + 1
        const isMe = entry.userId === currentUserId
        const isFlashing = flashedUser === entry.userId
        const rankLabel = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank)

        return (
          <motion.div
            key={entry.userId}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ layout: { type: 'spring', stiffness: 300, damping: 30 }, duration: 0.3 }}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors duration-500 ${
              isFlashing
                ? 'border-goal/40 bg-goal/10'
                : isMe
                  ? 'border-gold/20 bg-gold/5'
                  : 'border-border bg-surface-1'
            }`}
          >
            <motion.span
              key={`rank-${entry.userId}-${rank}`}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="w-6 text-center text-sm font-black text-fg-3"
            >
              {rankLabel}
            </motion.span>
            <Avatar username={entry.username} avatarUrl={entry.avatarUrl} />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-bold text-fg-1">
                {entry.username}{isMe && <span className="ml-1 text-xs text-fg-3">(you)</span>}
              </p>
              <p className="font-mono text-xs text-fg-3">
                {entry.predictionsMade} picks{entry.perfectScores > 0 && ` · 🎯 ${entry.perfectScores}`}
              </p>
            </div>
            <motion.span
              key={`pts-${entry.userId}-${entry.points}`}
              initial={{ scale: 1.3, color: '#2ed573' }}
              animate={{ scale: 1, color: isFlashing ? '#2ed573' : '#f5c842' }}
              transition={{ duration: 0.5 }}
              className="font-mono text-lg font-black"
            >
              {entry.points}
            </motion.span>
          </motion.div>
        )
      })}
      </AnimatePresence>

      {entries.length === 0 && (
        <div className="rounded-2xl border border-border bg-surface-1 p-8 text-center">
          <p className="text-fg-2">No members yet. Share the invite link!</p>
        </div>
      )}
      </div>
    </div>
  )
}
