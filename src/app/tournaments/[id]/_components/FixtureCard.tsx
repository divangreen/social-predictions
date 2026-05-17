'use client'

import { useState } from 'react'
import { savePrediction } from '../actions'
import type { Fixture, Prediction } from '@/types/database'

async function shareResult(fixture: Fixture, pred: Prediction, onCopied: () => void) {
  const actual = `${fixture.home_score}–${fixture.away_score}`
  const myPick = `${pred.predicted_home_score}–${pred.predicted_away_score}`
  const pts = pred.points_earned ?? 0
  const lines = [
    `⚽ ${fixture.home_team_name} ${actual} ${fixture.away_team_name}`,
    pred.is_perfect
      ? `🎯 I predicted the exact score — ${myPick}!`
      : pts > 0
        ? `✅ I called the result (picked ${myPick})`
        : `My pick was ${myPick}`,
    `+${pts} pts on predictr`,
  ]
  const text = lines.join('\n')
  try {
    if (navigator.share) {
      await navigator.share({ text })
    } else {
      await navigator.clipboard.writeText(text)
      onCopied()
    }
  } catch { /* user cancelled or browser denied */ }
}

interface Props {
  fixture: Fixture
  tournamentId: string
  existing: Prediction | null
  locked: boolean
}

function ScoreButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-lg font-bold text-white transition active:scale-90 hover:bg-zinc-700"
    >
      {children}
    </button>
  )
}

export default function FixtureCard({ fixture, tournamentId, existing, locked }: Props) {
  const [home, setHome] = useState(existing?.predicted_home_score ?? 0)
  const [away, setAway] = useState(existing?.predicted_away_score ?? 0)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle')

  const isDirty = existing === null ||
    home !== existing.predicted_home_score ||
    away !== existing.predicted_away_score

  async function handleSave() {
    setStatus('saving')
    const result = await savePrediction(fixture.id, tournamentId, home, away)
    if (result.error) {
      setErrorMsg(result.error)
      setStatus('error')
    } else {
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  function handleShare() {
    if (!existing) return
    shareResult(fixture, existing, () => {
      setShareStatus('copied')
      setTimeout(() => setShareStatus('idle'), 2000)
    })
  }

  const kickoff = new Date(fixture.kickoff_time)
  const kickoffLabel = kickoff.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  }) + ' · ' + kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const isScored = fixture.status === 'completed' && fixture.home_score != null && existing?.points_earned != null
  const pts = existing?.points_earned ?? 0

  return (
    <div className={`rounded-2xl border bg-zinc-900 p-4 ${isScored && pts > 0 ? 'border-green-500/30' : 'border-zinc-800'}`}>
      {/* Stage + kickoff */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">{fixture.stage}</span>
        <span className="text-xs text-zinc-500">{kickoffLabel}</span>
      </div>

      {/* Teams + score area */}
      <div className="flex items-center justify-between gap-2">

        {/* Home team */}
        <div className="flex flex-1 flex-col items-center gap-1">
          {fixture.home_team_logo && (
            <img src={fixture.home_team_logo} alt={fixture.home_team_name} className="h-8 w-8 object-contain" />
          )}
          <span className="text-center text-sm font-semibold text-white leading-tight">{fixture.home_team_name}</span>
          {fixture.is_underdog_home && (
            <span className="rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">underdog</span>
          )}
        </div>

        {/* Score */}
        {locked ? (
          <div className="flex flex-col items-center gap-1">
            {fixture.status === 'completed' && fixture.home_score != null ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white">{fixture.home_score}</span>
                <span className="text-zinc-500">–</span>
                <span className="text-2xl font-black text-white">{fixture.away_score}</span>
              </div>
            ) : (
              <span className="text-xs text-zinc-500">Locked</span>
            )}
            {existing && (
              <span className="text-xs text-zinc-500">
                My pick: {existing.predicted_home_score}–{existing.predicted_away_score}
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <ScoreButton onClick={() => setHome(h => Math.max(0, h - 1))}>−</ScoreButton>
                <span className="w-6 text-center text-xl font-black text-white">{home}</span>
                <ScoreButton onClick={() => setHome(h => Math.min(20, h + 1))}>+</ScoreButton>
              </div>
              <span className="text-zinc-500">–</span>
              <div className="flex items-center gap-1.5">
                <ScoreButton onClick={() => setAway(a => Math.max(0, a - 1))}>−</ScoreButton>
                <span className="w-6 text-center text-xl font-black text-white">{away}</span>
                <ScoreButton onClick={() => setAway(a => Math.min(20, a + 1))}>+</ScoreButton>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={status === 'saving' || (!isDirty && !!existing)}
              className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-40"
            >
              {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓ Saved' : existing ? 'Update' : 'Save'}
            </button>

            {status === 'error' && (
              <p className="text-center text-xs text-red-400">{errorMsg}</p>
            )}
          </div>
        )}

        {/* Away team */}
        <div className="flex flex-1 flex-col items-center gap-1">
          {fixture.away_team_logo && (
            <img src={fixture.away_team_logo} alt={fixture.away_team_name} className="h-8 w-8 object-contain" />
          )}
          <span className="text-center text-sm font-semibold text-white leading-tight">{fixture.away_team_name}</span>
          {fixture.is_underdog_away && (
            <span className="rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">underdog</span>
          )}
        </div>

      </div>

      {/* Result + share — the "I called it" moment */}
      {isScored && existing && (
        <div className={`mt-3 rounded-xl px-3 py-2 ${pts > 0 ? 'bg-green-500/10' : 'bg-zinc-800'}`}>
          <div className="flex items-center justify-between gap-2">
            <div>
              {existing.is_perfect ? (
                <p className="text-sm font-bold text-green-400">🎯 Perfect score!</p>
              ) : pts > 0 ? (
                <p className="text-sm font-bold text-green-400">✅ Correct result</p>
              ) : (
                <p className="text-sm font-bold text-zinc-500">✗ Missed</p>
              )}
              <p className="text-xs text-zinc-500">
                +{pts} pts · picked {existing.predicted_home_score}–{existing.predicted_away_score}
              </p>
            </div>
            <button
              onClick={handleShare}
              className="shrink-0 rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white active:scale-95"
            >
              {shareStatus === 'copied' ? '✓ Copied' : 'Share'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
