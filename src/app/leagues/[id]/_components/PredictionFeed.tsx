'use client'

import { useEffect, useMemo, useState } from 'react'
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
  banter: string | null
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
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const channel = supabase
      .channel(`feed-${leagueId}`)
      .on(
        'postgres_changes',
        // No row-level filter here: Supabase Realtime doesn't support filtering
        // on non-PK columns in free-tier. We receive all reaction events and
        // discard those for predictions not in the current feed client-side.
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
      <div className="rounded-2xl border border-border bg-surface-1 p-6 text-center">
        <p className="text-sm text-fg-3">No predictions yet. Be the first to pick!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.id} className="rounded-2xl border border-border bg-surface-1 p-4">
          {item.banter && (
            <div className="mb-3 rounded-xl bg-surface-2 px-3 py-2">
              <p className="text-xs font-bold text-fg-3">🤖 predictr AI</p>
              <p className="mt-0.5 text-sm italic text-fg-2">&ldquo;{item.banter}&rdquo;</p>
            </div>
          )}
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-fg-1">
              {item.username[0]?.toUpperCase()}
            </div>
            <span className="text-sm font-semibold text-fg-1">{item.username}</span>
            {item.userId === currentUserId && (
              <span className="text-xs text-fg-3">(you)</span>
            )}
            <span className="ml-auto text-xs text-fg-3">{formatTime(item.createdAt)}</span>
          </div>

          <p className="mb-3 text-sm text-fg-3">
            {item.homeTeam}
            <span className="mx-2 font-black text-fg-1">
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
                    ? 'border border-fg-1/20 bg-fg-1/10 text-fg-1'
                    : 'border border-border text-fg-3 hover:border-fg-2 hover:text-fg-2'
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
