'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const EMOJIS = ['🔥', '💀', '😂', '🎯'] as const
type Emoji = typeof EMOJIS[number]

export type FeedItem = {
  id: string
  userId: string
  username: string
  homeTeam: string
  awayTeam: string
  predictedHome: number
  predictedAway: number
  createdAt: string
  reactions: { emoji: Emoji; count: number; byMe: boolean }[]
}

function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(iso).toLocaleDateString()
}

export function PredictionFeed({
  initial,
  currentUserId,
  leagueId,
}: {
  initial: FeedItem[]
  currentUserId: string
  leagueId: string
}) {
  const [items, setItems] = useState<FeedItem[]>(initial)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`feed-${leagueId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reactions' },
        async (payload) => {
          const predictionId =
            (payload.new as { prediction_id?: string })?.prediction_id ??
            (payload.old as { prediction_id?: string })?.prediction_id
          if (!predictionId) return

          const { data } = await supabase
            .from('reactions')
            .select('emoji, user_id')
            .eq('prediction_id', predictionId)

          if (!data) return

          setItems(prev =>
            prev.map(item => {
              if (item.id !== predictionId) return item
              return {
                ...item,
                reactions: EMOJIS.map(e => ({
                  emoji: e,
                  count: data.filter(r => r.emoji === e).length,
                  byMe: data.some(r => r.emoji === e && r.user_id === currentUserId),
                })),
              }
            })
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [leagueId, currentUserId])

  async function toggleReaction(predictionId: string, emoji: Emoji, byMe: boolean) {
    // Optimistic update
    setItems(prev =>
      prev.map(item => {
        if (item.id !== predictionId) return item
        return {
          ...item,
          reactions: item.reactions.map(r =>
            r.emoji !== emoji
              ? r
              : { ...r, byMe: !byMe, count: Math.max(0, r.count + (byMe ? -1 : 1)) }
          ),
        }
      })
    )

    if (byMe) {
      await supabase
        .from('reactions')
        .delete()
        .eq('prediction_id', predictionId)
        .eq('user_id', currentUserId)
        .eq('emoji', emoji)
    } else {
      await supabase
        .from('reactions')
        .upsert({ prediction_id: predictionId, user_id: currentUserId, emoji })
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 p-6 text-center">
        <p className="text-sm text-zinc-500">No predictions yet. Be the first to pick!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-white">
              {item.username[0]?.toUpperCase()}
            </div>
            <span className="text-sm font-semibold text-white">{item.username}</span>
            {item.userId === currentUserId && (
              <span className="text-xs text-zinc-500">(you)</span>
            )}
            <span className="ml-auto text-xs text-zinc-500">{formatTime(item.createdAt)}</span>
          </div>

          <p className="mb-3 text-sm text-zinc-400">
            {item.homeTeam}
            <span className="mx-2 font-black text-white">
              {item.predictedHome} – {item.predictedAway}
            </span>
            {item.awayTeam}
          </p>

          <div className="flex gap-2">
            {item.reactions.map(r => (
              <button
                key={r.emoji}
                onClick={() => toggleReaction(item.id, r.emoji, r.byMe)}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm transition ${
                  r.byMe
                    ? 'border border-white/20 bg-white/10 text-white'
                    : 'border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                }`}
              >
                {r.emoji}
                {r.count > 0 && <span className="text-xs">{r.count}</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
