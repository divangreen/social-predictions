'use client'

import { useState } from 'react'
import Link from 'next/link'
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
  username?: string
  siteUrl?: string
}

function ScoreButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-xl font-black text-fg-1 transition active:scale-90 hover:bg-border"
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
  const kickoffLabel =
    kickoff.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' · ' +
    kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const isScored = fixture.status === 'completed' && fixture.home_score != null && existing?.points_earned != null
  const isLive = fixture.status === 'live'
  const pts = existing?.points_earned ?? 0

  const cardBorder = isScored && pts > 0
    ? 'border-goal/25'
    : isLive
      ? 'border-live/30'
      : 'border-border'

  return (
    <div className={`rounded-2xl border ${cardBorder} bg-surface-1 p-4 transition`}>

      {/* Stage row + kickoff — tapping this navigates to match detail */}
      <Link
        href={`/tournaments/${tournamentId}/fixtures/${fixture.id}`}
        className="mb-3 flex items-center justify-between hover:opacity-80 transition"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-xs font-bold uppercase tracking-wider text-fg-3">{fixture.stage}</span>
          {isLive && (
            <span className="flex items-center gap-1 rounded-full bg-live/10 px-2 py-0.5 text-[10px] font-bold text-live">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
              LIVE
            </span>
          )}
        </div>
        <span className="shrink-0 font-mono text-xs text-fg-3">{kickoffLabel} →</span>
      </Link>

      {/* Teams + score area */}
      <div className="flex items-center justify-between gap-2 overflow-hidden">

        {/* Home team */}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          {fixture.home_team_logo && (
            <img src={fixture.home_team_logo} alt={fixture.home_team_name} className="h-9 w-9 object-contain" />
          )}
          <span className="w-full wrap-break-word text-center text-sm font-bold text-fg-1 leading-tight">{fixture.home_team_name}</span>
          {fixture.is_underdog_home && (
            <span className="rounded-full bg-gold/10 px-1.5 py-0.5 text-[10px] font-bold text-gold">underdog</span>
          )}
        </div>

        {/* Centre: score or prediction input */}
        {locked ? (
          <div className="flex flex-col items-center gap-1.5">
            {fixture.status === 'completed' && fixture.home_score != null ? (
              <div className="flex items-center gap-3">
                <span className="font-mono text-3xl font-black text-fg-1">{fixture.home_score}</span>
                <span className="text-fg-3">–</span>
                <span className="font-mono text-3xl font-black text-fg-1">{fixture.away_score}</span>
              </div>
            ) : isLive ? (
              <span className="rounded-full bg-live/10 px-3 py-1 text-xs font-bold text-live">In Progress</span>
            ) : (
              <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-bold text-fg-3">Locked</span>
            )}
            {existing && (
              <span className="font-mono text-xs text-fg-3">
                My pick: {existing.predicted_home_score}–{existing.predicted_away_score}
              </span>
            )}
          </div>
        ) : (
          <div className="flex shrink-0 flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <ScoreButton onClick={() => setHome(h => Math.max(0, h - 1))}>−</ScoreButton>
                <span className="w-7 text-center font-mono text-2xl font-black text-fg-1">{home}</span>
                <ScoreButton onClick={() => setHome(h => Math.min(20, h + 1))}>+</ScoreButton>
              </div>
              <span className="text-fg-3">–</span>
              <div className="flex items-center gap-1.5">
                <ScoreButton onClick={() => setAway(a => Math.max(0, a - 1))}>−</ScoreButton>
                <span className="w-7 text-center font-mono text-2xl font-black text-fg-1">{away}</span>
                <ScoreButton onClick={() => setAway(a => Math.min(20, a + 1))}>+</ScoreButton>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={status === 'saving' || (!isDirty && !!existing)}
              className="rounded-full bg-fg-1 px-5 py-1.5 text-xs font-bold text-pitch transition hover:opacity-90 active:scale-95 disabled:opacity-30"
            >
              {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓ Saved' : existing ? 'Update' : 'Save'}
            </button>

            {status === 'error' && (
              <p className="text-center text-xs text-loss">{errorMsg}</p>
            )}
          </div>
        )}

        {/* Away team */}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          {fixture.away_team_logo && (
            <img src={fixture.away_team_logo} alt={fixture.away_team_name} className="h-9 w-9 object-contain" />
          )}
          <span className="w-full wrap-break-word text-center text-sm font-bold text-fg-1 leading-tight">{fixture.away_team_name}</span>
          {fixture.is_underdog_away && (
            <span className="rounded-full bg-gold/10 px-1.5 py-0.5 text-[10px] font-bold text-gold">underdog</span>
          )}
        </div>

      </div>

      {/* Result panel */}
      {isScored && existing && (
        <div className={`mt-4 rounded-xl px-3 py-2.5 ${pts > 0 ? 'bg-goal/10' : 'bg-surface-2'}`}>
          <div className="flex items-center justify-between gap-2">
            <div>
              {existing.is_perfect ? (
                <p className="text-sm font-black text-goal">🎯 Perfect score!</p>
              ) : pts > 0 ? (
                <p className="text-sm font-black text-goal">✅ Correct result</p>
              ) : (
                <p className="text-sm font-bold text-fg-3">✗ Missed</p>
              )}
              <p className="font-mono text-xs text-fg-3">
                +{pts} pts · picked {existing.predicted_home_score}–{existing.predicted_away_score}
              </p>
            </div>
            <button
              onClick={handleShare}
              className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-bold text-fg-2 transition hover:border-fg-3 hover:text-fg-1 active:scale-95"
            >
              {shareStatus === 'copied' ? '✓ Copied' : 'Share'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
