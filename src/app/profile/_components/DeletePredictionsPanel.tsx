'use client'

import { useState, useTransition } from 'react'
import { deletePrediction } from '../actions'

export type PredictionRow = {
  id: string
  homeTeam: string
  awayTeam: string
  kickoffTime: string
  fixtureStatus: string | null
  predictionType: 'score' | 'result'
  predictedHome: number | null
  predictedAway: number | null
  predictedResult: 'home' | 'draw' | 'away' | null
  pointsEarned: number | null
  isPerfect: boolean | null
}

export function DeletePredictionsPanel({ predictions }: { predictions: PredictionRow[] }) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  const visible = predictions.filter(p => !deletedIds.has(p.id))

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deletePrediction(id)
      if (!result.error) {
        setDeletedIds(prev => new Set([...prev, id]))
        setConfirmingId(null)
      }
    })
  }

  if (visible.length === 0) {
    return (
      <p className="text-center text-sm text-fg-3 py-4">No predictions to manage.</p>
    )
  }

  return (
    <div className="space-y-2">
      {visible.map(pred => {
        const isConfirming = confirmingId === pred.id
        const locked = pred.fixtureStatus !== 'scheduled'
        const predLabel = pred.predictionType === 'score' && pred.predictedHome != null && pred.predictedAway != null
          ? `${pred.predictedHome}–${pred.predictedAway}`
          : pred.predictedResult === 'home' ? `${pred.homeTeam} win`
          : pred.predictedResult === 'away' ? `${pred.awayTeam} win`
          : pred.predictedResult === 'draw' ? 'Draw'
          : '—'
        const pts = pred.pointsEarned

        return (
          <div key={pred.id} className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-bold text-fg-1">
                  {pred.homeTeam} vs {pred.awayTeam}
                </p>
                <p className="text-xs text-fg-3">
                  My pick: <span className="font-bold text-fg-2">{predLabel}</span>
                  {pred.isPerfect && ' · 🎯'}
                  {pts != null && (
                    <span className={`ml-2 font-mono font-black ${pts > 0 ? 'text-goal' : 'text-fg-3'}`}>
                      {pts > 0 ? `+${pts}` : '0'} pts
                    </span>
                  )}
                  {locked && pts == null && (
                    <span className="ml-2 text-fg-3">· locked</span>
                  )}
                </p>
              </div>
              {!isConfirming && (
                <button
                  onClick={() => setConfirmingId(pred.id)}
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-fg-3 transition hover:bg-surface-2 hover:text-loss"
                >
                  Delete
                </button>
              )}
            </div>

            {isConfirming && (
              <div className="border-t border-border bg-loss/5 px-4 py-3">
                <p className="mb-3 text-xs font-bold text-loss">
                  ⚠️ Delete this prediction? This cannot be undone.
                  {pts != null && pts > 0 && ' Your earned points will remain on the leaderboard but this pick will be removed.'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmingId(null)}
                    disabled={isPending}
                    className="flex-1 rounded-xl border border-border py-2 text-xs font-bold text-fg-2 transition hover:border-fg-3 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(pred.id)}
                    disabled={isPending}
                    className="flex-1 rounded-xl bg-loss py-2 text-xs font-black text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    {isPending ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
