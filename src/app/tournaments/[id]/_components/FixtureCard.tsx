'use client'

import { useState } from 'react'
import Link from 'next/link'
import { savePrediction } from '../actions'
import type { Fixture, Prediction } from '@/types/database'
import type { PredictionResult } from '@/lib/scoring'

async function shareResult(
  fixture: Fixture,
  pred: Prediction,
  onCopied: () => void,
  username: string,
  siteUrl: string,
) {
  const pts = pred.points_earned ?? 0
  const params = new URLSearchParams({
    home: fixture.home_team_name,
    away: fixture.away_team_name,
    hs: String(fixture.home_score ?? ''),
    as: String(fixture.away_score ?? ''),
    u: username,
    pts: String(pts),
    ...(pred.is_perfect ? { p: '1' } : {}),
  })
  const url = `${siteUrl}/share/prediction?${params.toString()}`
  try {
    if (navigator.share) {
      await navigator.share({ url, title: `${fixture.home_team_name} vs ${fixture.away_team_name} — predictr` })
    } else {
      await navigator.clipboard.writeText(url)
      onCopied()
    }
  } catch { /* user cancelled or browser denied */ }
}

interface Props {
  fixture: Fixture
  tournamentId: string
  existing: Prediction | null
  locked: boolean
  maxScore?: number
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

function ResultButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full py-2.5 text-[10px] font-black leading-tight transition active:scale-95 overflow-hidden ${
        active
          ? 'bg-fg-1 text-pitch'
          : 'border border-border bg-surface-2 text-fg-2 hover:border-fg-3 hover:text-fg-1'
      }`}
    >
      <span className="block truncate px-1">{label}</span>
    </button>
  )
}

export default function FixtureCard({
  fixture,
  tournamentId,
  existing,
  locked,
  maxScore = 20,
  username = 'predictr',
  siteUrl = '',
}: Props) {
  const existingType = existing?.prediction_type ?? 'score'
  const existingResult = existing?.predicted_result ?? null

  const [pickMode, setPickMode] = useState<'score' | 'result'>(existingType)
  const [home, setHome] = useState(existing?.predicted_home_score ?? 0)
  const [away, setAway] = useState(existing?.predicted_away_score ?? 0)
  const [selectedResult, setSelectedResult] = useState<PredictionResult | null>(existingResult)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle')

  const isDirty = existing === null || (() => {
    if (pickMode !== existingType) return true
    if (pickMode === 'result') return selectedResult !== existingResult
    return home !== existing.predicted_home_score || away !== existing.predicted_away_score
  })()

  function selectResult(r: PredictionResult) {
    setPickMode('result')
    setSelectedResult(r)
  }

  function onScoreInteract() {
    setPickMode('score')
    setSelectedResult(null)
  }

  async function handleSave() {
    setStatus('saving')
    const result = pickMode === 'result'
      ? await savePrediction(fixture.id, tournamentId, null, null, 'result', selectedResult)
      : await savePrediction(fixture.id, tournamentId, home, away, 'score', null)

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
    }, username, siteUrl)
  }

  const kickoff = new Date(fixture.kickoff_time)
  const kickoffLabel =
    kickoff.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' · ' +
    kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const isScored = fixture.status === 'completed' && fixture.home_score != null && existing?.points_earned != null
  const isLive = fixture.status === 'live'
  const pts = existing?.points_earned ?? 0

  const actualResult = fixture.home_score != null && fixture.away_score != null
    ? fixture.home_score > fixture.away_score ? 'home'
      : fixture.away_score > fixture.home_score ? 'away'
      : 'draw'
    : null
  const isUnderdogWin =
    (actualResult === 'home' && !!fixture.is_underdog_home) ||
    (actualResult === 'away' && !!fixture.is_underdog_away)

  const predictedResultForDisplay: PredictionResult | null = existing
    ? existing.prediction_type === 'result'
      ? existing.predicted_result
      : existing.predicted_home_score != null && existing.predicted_away_score != null
        ? existing.predicted_home_score > existing.predicted_away_score ? 'home'
          : existing.predicted_away_score > existing.predicted_home_score ? 'away'
          : 'draw'
        : null
    : null
  const gotUpsetBonus = isUnderdogWin && predictedResultForDisplay !== null && predictedResultForDisplay === actualResult

  const cardBorder = isScored && pts > 0
    ? 'border-goal/25'
    : isLive
      ? 'border-live/30'
      : 'border-border'

  return (
    <div className={`rounded-2xl border ${cardBorder} bg-surface-1 p-4 transition`}>

      {/* Stage row + kickoff */}
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

        {/* Centre */}
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
                {existing.prediction_type === 'result'
                  ? `My pick: ${existing.predicted_result === 'home' ? fixture.home_team_name : existing.predicted_result === 'away' ? fixture.away_team_name : 'Draw'}`
                  : `My pick: ${existing.predicted_home_score}–${existing.predicted_away_score}`}
              </span>
            )}
          </div>
        ) : (
          <div className="flex shrink-0 flex-col items-center gap-3">

            {/* H/D/A result buttons */}
            <div className="flex gap-1.5">
              <ResultButton
                label={fixture.home_team_name}
                active={pickMode === 'result' && selectedResult === 'home'}
                onClick={() => selectResult('home')}
              />
              <ResultButton
                label="Draw"
                active={pickMode === 'result' && selectedResult === 'draw'}
                onClick={() => selectResult('draw')}
              />
              <ResultButton
                label={fixture.away_team_name}
                active={pickMode === 'result' && selectedResult === 'away'}
                onClick={() => selectResult('away')}
              />
            </div>

            {/* Divider */}
            <div className="flex w-full items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-fg-3">or exact score +5pts</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Score picker */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <ScoreButton onClick={() => { setHome(h => Math.max(0, h - 1)); onScoreInteract() }}>−</ScoreButton>
                <input
                  type="number"
                  inputMode="numeric"
                  value={pickMode === 'score' ? home : ''}
                  placeholder="–"
                  onChange={e => {
                    const v = parseInt(e.target.value)
                    if (!isNaN(v)) { setHome(Math.min(maxScore, Math.max(0, v))); onScoreInteract() }
                  }}
                  onFocus={onScoreInteract}
                  className={`${maxScore > 99 ? 'w-14' : 'w-9'} rounded-lg bg-transparent text-center font-mono text-2xl font-black text-fg-1 outline-none focus:bg-surface-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                />
                <ScoreButton onClick={() => { setHome(h => Math.min(maxScore, h + 1)); onScoreInteract() }}>+</ScoreButton>
              </div>
              <span className="text-fg-3">–</span>
              <div className="flex items-center gap-1.5">
                <ScoreButton onClick={() => { setAway(a => Math.max(0, a - 1)); onScoreInteract() }}>−</ScoreButton>
                <input
                  type="number"
                  inputMode="numeric"
                  value={pickMode === 'score' ? away : ''}
                  placeholder="–"
                  onChange={e => {
                    const v = parseInt(e.target.value)
                    if (!isNaN(v)) { setAway(Math.min(maxScore, Math.max(0, v))); onScoreInteract() }
                  }}
                  onFocus={onScoreInteract}
                  className={`${maxScore > 99 ? 'w-14' : 'w-9'} rounded-lg bg-transparent text-center font-mono text-2xl font-black text-fg-1 outline-none focus:bg-surface-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                />
                <ScoreButton onClick={() => { setAway(a => Math.min(maxScore, a + 1)); onScoreInteract() }}>+</ScoreButton>
              </div>
            </div>

            {/* Prediction mode label — makes the current pick unmistakably clear */}
            <p className="text-center text-[10px] font-bold uppercase tracking-wider text-fg-3">
              {pickMode === 'result'
                ? selectedResult
                  ? `${selectedResult === 'home' ? fixture.home_team_name : selectedResult === 'away' ? fixture.away_team_name : 'Draw'} · 2pts max`
                  : 'Pick a result above'
                : `${home} – ${away} · up to 5pts if exact`}
            </p>

            <button
              onClick={handleSave}
              disabled={
                status === 'saving' ||
                (!isDirty && !!existing) ||
                (pickMode === 'result' && !selectedResult)
              }
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
                {existing.prediction_type === 'result'
                  ? `+${pts} pts · picked ${existing.predicted_result}`
                  : `+${pts} pts · picked ${existing.predicted_home_score}–${existing.predicted_away_score}`}
              </p>
              {gotUpsetBonus && (
                <p className="mt-0.5 text-xs font-bold text-gold">🗡️ +1 upset bonus</p>
              )}
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
