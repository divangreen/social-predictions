'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

const EMOJIS = ['🔥', '💀', '😂', '🎯'] as const
type Emoji = typeof EMOJIS[number]

export type FeedItem = {
  id: string
  userId: string
  username: string
  homeTeam: string
  awayTeam: string
  predictionType: 'score' | 'result'
  predictedHome: number | null
  predictedAway: number | null
  predictedResult: 'home' | 'draw' | 'away' | null
  createdAt: string
  banter: string | null
  reactions: { emoji: Emoji; count: number; byMe: boolean }[]
  // Phase 2 fields
  fixtureId: string
  kickoffTime: string
  fixtureStatus: 'scheduled' | 'live' | 'completed' | null
  homeScore: number | null
  awayScore: number | null
  pointsEarned: number | null
  isPerfect: boolean | null
}

function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(iso).toLocaleDateString()
}

function buildShareUrl(item: FeedItem, siteUrl: string) {
  const params = new URLSearchParams({
    home: item.homeTeam,
    away: item.awayTeam,
    u: item.username,
    pts: String(item.pointsEarned ?? 0),
  })
  if (item.homeScore != null) params.set('hs', String(item.homeScore))
  if (item.awayScore != null) params.set('as', String(item.awayScore))
  if (item.predictionType === 'score') {
    if (item.predictedHome != null) params.set('ph', String(item.predictedHome))
    if (item.predictedAway != null) params.set('pa', String(item.predictedAway))
  } else if (item.predictedResult) {
    params.set('pr', item.predictedResult)
  }
  if (item.isPerfect) params.set('p', '1')
  return `${siteUrl}/share/prediction?${params.toString()}`
}

async function share(url: string, title: string, onCopied: () => void) {
  try {
    if (navigator.share) {
      await navigator.share({ url, title })
    } else {
      await navigator.clipboard.writeText(url)
      onCopied()
    }
  } catch { /* cancelled */ }
}

export function PredictionFeed({
  initial,
  currentUserId,
  leagueId,
  siteUrl = '',
}: {
  initial: FeedItem[]
  currentUserId: string
  leagueId: string
  siteUrl?: string
}) {
  const [items, setItems] = useState<FeedItem[]>(initial)
  const [calledItId, setCalledItId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const prevItemsRef = useRef<FeedItem[]>(initial)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    prevItemsRef.current = items
  }, [items])

  useEffect(() => {
    const channel = supabase
      .channel(`feed-${leagueId}`)
      // Reactions
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, async (payload) => {
        const predictionId =
          (payload.new as { prediction_id?: string })?.prediction_id ??
          (payload.old as { prediction_id?: string })?.prediction_id
        if (!predictionId) return
        const { data } = await supabase.from('reactions').select('emoji, user_id').eq('prediction_id', predictionId)
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
      })
      // Fixture status/score updates → real-time unmask + live indicator
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fixtures' }, (payload) => {
        const f = payload.new as { id: string; status: string | null; home_score: number | null; away_score: number | null }
        setItems(prev =>
          prev.map(item =>
            item.fixtureId === f.id
              ? { ...item, fixtureStatus: f.status as FeedItem['fixtureStatus'], homeScore: f.home_score, awayScore: f.away_score }
              : item
          )
        )
      })
      // Prediction scoring → reveal points + "I called it"
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'predictions' }, (payload) => {
        const p = payload.new as { id: string; points_earned: number | null; is_perfect: boolean | null }
        // Detect transition from unscored → scored for current user
        const prev = prevItemsRef.current.find(i => i.id === p.id)
        if (prev?.pointsEarned == null && p.points_earned != null && p.points_earned > 0 && prev?.userId === currentUserId) {
          setCalledItId(p.id)
          setTimeout(() => setCalledItId(null), 5000)
        }
        setItems(prevItems =>
          prevItems.map(item =>
            item.id === p.id ? { ...item, pointsEarned: p.points_earned, isPerfect: p.is_perfect } : item
          )
        )
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [leagueId, currentUserId])

  async function toggleReaction(predictionId: string, emoji: Emoji, byMe: boolean) {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== predictionId) return item
        return {
          ...item,
          reactions: item.reactions.map(r =>
            r.emoji !== emoji ? r : { ...r, byMe: !byMe, count: Math.max(0, r.count + (byMe ? -1 : 1)) }
          ),
        }
      })
    )
    if (byMe) {
      await supabase.from('reactions').delete().eq('prediction_id', predictionId).eq('user_id', currentUserId).eq('emoji', emoji)
    } else {
      await supabase.from('reactions').upsert({ prediction_id: predictionId, user_id: currentUserId, emoji })
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
      {items.map(item => {
        const now = new Date()
        const kickoff = new Date(item.kickoffTime)
        const isSealed = item.fixtureStatus === 'scheduled' && kickoff > now
        const isLive = item.fixtureStatus === 'live'
        const isScored = item.fixtureStatus === 'completed' && item.pointsEarned != null
        const isCalledIt = calledItId === item.id

        const predictionLabel = item.predictionType === 'result'
          ? item.predictedResult === 'home' ? `${item.homeTeam} win`
            : item.predictedResult === 'away' ? `${item.awayTeam} win`
            : 'Draw'
          : `${item.predictedHome} – ${item.predictedAway}`

        return (
          <div
            key={item.id}
            className={`rounded-2xl border bg-surface-1 p-4 transition-all duration-500 ${
              isCalledIt ? 'border-goal/50 bg-goal/5' : isLive ? 'border-live/30' : 'border-border'
            }`}
          >
            {/* AI banter */}
            {item.banter && (
              <div className="mb-3 rounded-xl bg-surface-2 px-3 py-2">
                <p className="text-xs font-bold text-fg-3">🤖 predictr AI</p>
                <p className="mt-0.5 text-sm italic text-fg-2">&ldquo;{item.banter}&rdquo;</p>
              </div>
            )}

            {/* "I called it" banner */}
            {isCalledIt && (
              <div className="mb-3 rounded-xl bg-goal/10 px-3 py-2 text-center">
                <p className="text-sm font-black text-goal">🎯 You called it! +{item.pointsEarned} pts</p>
              </div>
            )}

            {/* Header row */}
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-fg-1">
                {item.username[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-fg-1">{item.username}</span>
              {item.userId === currentUserId && <span className="text-xs text-fg-3">(you)</span>}
              {isLive && (
                <span className="flex items-center gap-1 rounded-full bg-live/10 px-2 py-0.5 text-[10px] font-bold text-live">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
                  LIVE
                </span>
              )}
              <span className="ml-auto text-xs text-fg-3">{formatTime(item.createdAt)}</span>
            </div>

            {/* Match + prediction */}
            <div className="mb-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-fg-3">
                {item.homeTeam} vs {item.awayTeam}
              </p>
              {isSealed ? (
                <p className="text-sm font-black text-fg-3">🔒 Sealed until kickoff</p>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-black text-fg-1">{predictionLabel}</span>
                  {isScored && (
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-xs font-bold text-fg-3">
                      actual: {item.homeScore}–{item.awayScore}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Score result row */}
            {isScored && !isSealed && (
              <div className={`mb-3 flex items-center justify-between rounded-xl px-3 py-2 ${(item.pointsEarned ?? 0) > 0 ? 'bg-goal/10' : 'bg-surface-2'}`}>
                <div>
                  {item.isPerfect ? (
                    <p className="text-xs font-black text-goal">🎯 Perfect score!</p>
                  ) : (item.pointsEarned ?? 0) > 0 ? (
                    <p className="text-xs font-black text-goal">✅ Correct result</p>
                  ) : (
                    <p className="text-xs font-bold text-fg-3">✗ Missed this one</p>
                  )}
                  <p className="font-mono text-xs text-fg-3">+{item.pointsEarned ?? 0} pts</p>
                </div>
                {(item.pointsEarned ?? 0) > 0 && siteUrl && (
                  <button
                    onClick={() => {
                      share(buildShareUrl(item, siteUrl), `${item.username} called ${item.homeTeam} vs ${item.awayTeam} — predictr`, () => {
                        setCopiedId(item.id)
                        setTimeout(() => setCopiedId(null), 2000)
                      })
                    }}
                    className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-bold text-fg-2 transition hover:border-fg-3 hover:text-fg-1 active:scale-95"
                  >
                    {copiedId === item.id ? '✓ Copied' : 'Share'}
                  </button>
                )}
              </div>
            )}

            {/* Reactions */}
            {!isSealed && (
              <div className="flex gap-2">
                {item.reactions.map(r => (
                  <button
                    key={r.emoji}
                    onClick={() => toggleReaction(item.id, r.emoji, r.byMe)}
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm transition active:scale-95 ${
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
            )}
          </div>
        )
      })}
    </div>
  )
}
