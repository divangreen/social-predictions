'use client'

import { useState } from 'react'
import type { MatchDetails, TimelineEvent } from '@/lib/match-details'

const EVENT_ICON: Record<TimelineEvent['type'], string> = {
  goal: '⚽',
  own_goal: '⚽',
  penalty: '⚽',
  yellow: '🟨',
  red: '🟥',
  yellow_red: '🟧',
  sub: '🔄',
}

const EVENT_LABEL: Record<TimelineEvent['type'], string> = {
  goal: '',
  own_goal: '(OG)',
  penalty: '(pen)',
  yellow: '',
  red: '',
  yellow_red: '',
  sub: '↑',
}

interface Props {
  fixture: {
    home_team_name: string
    away_team_name: string
    home_team_logo: string | null
    away_team_logo: string | null
    home_score: number | null
    away_score: number | null
    status: string | null
    kickoff_time: string
    stage: string
  }
  details: MatchDetails
  myPrediction: { predicted_home_score: number; predicted_away_score: number; points_earned: number | null; is_perfect: boolean | null } | null
  peerPredictions: { id: string; user_id: string; predicted_home_score: number; predicted_away_score: number; points_earned: number | null }[]
  userMap: Record<string, string>
  allPreds: { predicted_home_score: number; predicted_away_score: number }[]
}

type Tab = 'summary' | 'stats' | 'lineups' | 'info' | 'picks'

export function MatchTabs({ fixture, details, myPrediction, peerPredictions, userMap, allPreds }: Props) {
  const [tab, setTab] = useState<Tab>('summary')

  const isCompleted = fixture.status === 'completed' && fixture.home_score != null
  const isLive = fixture.status === 'live'
  const myPts = myPrediction?.points_earned ?? 0

  const total = allPreds.length
  const homeWins = allPreds.filter(p => p.predicted_home_score > p.predicted_away_score).length
  const draws = allPreds.filter(p => p.predicted_home_score === p.predicted_away_score).length
  const awayWins = allPreds.filter(p => p.predicted_home_score < p.predicted_away_score).length
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0

  const tabs: { key: Tab; label: string }[] = [
    { key: 'summary', label: 'Summary' },
    { key: 'stats', label: 'Stats' },
    { key: 'lineups', label: 'Line-ups' },
    { key: 'info', label: 'Info' },
    { key: 'picks', label: 'Picks' },
  ]

  const homeTimeline = details.timeline.filter(e => e.team === 'home')
  const awayTimeline = details.timeline.filter(e => e.team === 'away')

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-4 flex overflow-x-auto border-b border-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-4 py-2.5 text-sm font-bold transition ${
              tab === t.key
                ? 'border-b-2 border-gold text-gold'
                : 'text-fg-3 hover:text-fg-2'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Summary */}
      {tab === 'summary' && (
        <div className="space-y-3">
          {/* Half time */}
          {details.halfTimeHome !== null && details.halfTimeAway !== null && (
            <div className="rounded-2xl border border-border bg-surface-1 p-3 text-center">
              <p className="text-xs font-bold text-fg-3">Half Time</p>
              <p className="font-mono text-lg font-black text-fg-2">
                {details.halfTimeHome} – {details.halfTimeAway}
              </p>
            </div>
          )}

          {/* Timeline */}
          {details.timeline.length > 0 ? (
            <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
              {details.timeline.map((e, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-border' : ''} ${e.team === 'home' ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  {/* Player name side */}
                  <div className={`min-w-0 flex-1 ${e.team === 'home' ? 'text-left' : 'text-right'}`}>
                    <p className="truncate text-sm font-bold text-fg-1">
                      {e.player} {EVENT_LABEL[e.type] && <span className="text-xs text-fg-3">{EVENT_LABEL[e.type]}</span>}
                    </p>
                    {e.detail && e.type === 'goal' && (
                      <p className="text-xs text-fg-3">Assist: {e.detail}</p>
                    )}
                    {e.detail && e.type === 'sub' && (
                      <p className="text-xs text-fg-3">↓ {e.detail}</p>
                    )}
                  </div>
                  {/* Centre: icon + minute */}
                  <div className="flex w-14 shrink-0 flex-col items-center gap-0.5">
                    <span className="text-base">{EVENT_ICON[e.type]}</span>
                    <span className="font-mono text-[10px] text-fg-3">{e.minute}&apos;</span>
                  </div>
                  {/* Empty side */}
                  <div className="flex-1" />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface-1 p-8 text-center">
              <p className="text-fg-3">{isCompleted || isLive ? 'No events available' : 'Match not started'}</p>
            </div>
          )}

          {/* Side-by-side timeline for goals */}
          {(homeTimeline.length > 0 || awayTimeline.length > 0) && details.timeline.length === 0 && (
            <div className="rounded-2xl border border-border bg-surface-1 p-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <p className="mb-2 text-xs font-bold uppercase text-fg-3">{fixture.home_team_name}</p>
                  {homeTimeline.filter(e => e.type === 'goal' || e.type === 'penalty' || e.type === 'own_goal').map((e, i) => (
                    <p key={i} className="text-sm text-fg-1">⚽ {e.player} <span className="text-xs text-fg-3">{e.minute}&apos;</span></p>
                  ))}
                </div>
                <div className="flex-1 space-y-1 text-right">
                  <p className="mb-2 text-xs font-bold uppercase text-fg-3">{fixture.away_team_name}</p>
                  {awayTimeline.filter(e => e.type === 'goal' || e.type === 'penalty' || e.type === 'own_goal').map((e, i) => (
                    <p key={i} className="text-sm text-fg-1"><span className="text-xs text-fg-3">{e.minute}&apos;</span> {e.player} ⚽</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {tab === 'stats' && (
        <div className="rounded-2xl border border-border bg-surface-1 p-4">
          {details.stats.length > 0 ? (
            <div className="space-y-4">
              {/* Team headers */}
              <div className="flex items-center justify-between text-xs font-bold text-fg-3">
                <span className="max-w-[35%] truncate">{fixture.home_team_name}</span>
                <span />
                <span className="max-w-[35%] truncate text-right">{fixture.away_team_name}</span>
              </div>
              {details.stats.map(stat => {
                const h = parseFloat(String(stat.home).replace('%', ''))
                const a = parseFloat(String(stat.away).replace('%', ''))
                const sum = h + a
                const homePct = sum > 0 ? (h / sum) * 100 : 50
                return (
                  <div key={stat.label}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-black text-fg-1 w-10 text-left">{stat.home}</span>
                      <span className="flex-1 text-center text-xs font-bold text-fg-3">{stat.label}</span>
                      <span className="font-mono text-sm font-black text-fg-1 w-10 text-right">{stat.away}</span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="bg-info rounded-l-full" style={{ width: `${homePct}%` }} />
                      <div className="bg-gold rounded-r-full" style={{ width: `${100 - homePct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-fg-3">Stats not available for this match</p>
          )}
        </div>
      )}

      {/* Line-ups */}
      {tab === 'lineups' && (
        <div className="space-y-3">
          {details.homeStarting.length > 0 || details.awayStarting.length > 0 ? (
            <>
              {/* Formations */}
              {details.homeFormation && details.awayFormation && (
                <div className="flex justify-between rounded-2xl border border-border bg-surface-1 px-4 py-2.5">
                  <span className="font-mono text-sm font-black text-fg-1">{details.homeFormation}</span>
                  <span className="text-xs font-bold text-fg-3">Formation</span>
                  <span className="font-mono text-sm font-black text-fg-1">{details.awayFormation}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {/* Home starting */}
                <div className="rounded-2xl border border-border bg-surface-1 p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-fg-3 truncate">{fixture.home_team_name}</p>
                  {details.homeStarting.map((p, i) => (
                    <div key={i} className="flex items-center gap-1.5 py-1 border-b border-border last:border-0">
                      {p.number && <span className="font-mono text-[10px] text-fg-3 w-4 text-center">{p.number}</span>}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-fg-1 truncate">{p.name}</p>
                        {p.position && <p className="text-[10px] text-fg-3">{p.position}</p>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Away starting */}
                <div className="rounded-2xl border border-border bg-surface-1 p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-fg-3 truncate">{fixture.away_team_name}</p>
                  {details.awayStarting.map((p, i) => (
                    <div key={i} className="flex items-center gap-1.5 py-1 border-b border-border last:border-0">
                      {p.number && <span className="font-mono text-[10px] text-fg-3 w-4 text-center">{p.number}</span>}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-fg-1 truncate">{p.name}</p>
                        {p.position && <p className="text-[10px] text-fg-3">{p.position}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subs */}
              {(details.homeSubs.length > 0 || details.awaySubs.length > 0) && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-border bg-surface-1 p-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-fg-3">Substitutes</p>
                    {details.homeSubs.map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5 py-1 border-b border-border last:border-0">
                        {p.number && <span className="font-mono text-[10px] text-fg-3 w-4 text-center">{p.number}</span>}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-fg-1 truncate">{p.name}</p>
                          {p.position && <p className="text-[10px] text-fg-3">{p.position}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-border bg-surface-1 p-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-fg-3">Substitutes</p>
                    {details.awaySubs.map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5 py-1 border-b border-border last:border-0">
                        {p.number && <span className="font-mono text-[10px] text-fg-3 w-4 text-center">{p.number}</span>}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-fg-1 truncate">{p.name}</p>
                          {p.position && <p className="text-[10px] text-fg-3">{p.position}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-surface-1 p-8 text-center">
              <p className="text-fg-3">Line-ups not available</p>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      {tab === 'info' && (
        <div className="rounded-2xl border border-border bg-surface-1 divide-y divide-border overflow-hidden">
          {[
            { icon: '📅', label: 'Date', value: fixture.kickoff_time ? new Date(fixture.kickoff_time).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' }) : null },
            { icon: '🏟️', label: 'Stadium', value: details.venue },
            { icon: '🟨', label: 'Referee', value: details.referee },
            { icon: '👥', label: 'Attendance', value: details.attendance ? details.attendance.toLocaleString() : null },
            { icon: '📋', label: 'Formations', value: details.homeFormation && details.awayFormation ? `${details.homeFormation} vs ${details.awayFormation}` : null },
            { icon: '⚽', label: 'Stage', value: fixture.stage },
          ].filter(r => r.value).map(row => (
            <div key={row.label} className="flex items-center gap-3 px-4 py-3">
              <span className="text-lg">{row.icon}</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-fg-3">{row.label}</p>
                <p className="text-sm font-bold text-fg-1">{row.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Picks */}
      {tab === 'picks' && (
        <div className="space-y-3">
          {/* My result */}
          {myPrediction && (
            <div className={`rounded-2xl border p-4 ${isCompleted && myPts > 0 ? 'border-goal/25 bg-goal/5' : 'border-border bg-surface-1'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-fg-3 mb-1">My prediction</p>
                  <p className="font-mono text-xl font-black text-fg-1">
                    {myPrediction.predicted_home_score} – {myPrediction.predicted_away_score}
                  </p>
                  {isCompleted && (
                    <p className="mt-1 text-sm font-bold">
                      {myPrediction.is_perfect ? <span className="text-goal">🎯 Perfect score!</span>
                        : myPts > 0 ? <span className="text-goal">✅ Correct result</span>
                        : <span className="text-fg-3">✗ Missed</span>}
                    </p>
                  )}
                </div>
                {isCompleted && <span className="font-mono text-2xl font-black text-gold">+{myPts}</span>}
              </div>
            </div>
          )}

          {/* Community distribution */}
          {total > 0 && (
            <div className="rounded-2xl border border-border bg-surface-1 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-fg-3">Community · {total} picks</p>
              <div className="space-y-2.5">
                {[
                  { label: fixture.home_team_name, count: homeWins, p: pct(homeWins), color: 'bg-info' },
                  { label: 'Draw', count: draws, p: pct(draws), color: 'bg-fg-3' },
                  { label: fixture.away_team_name, count: awayWins, p: pct(awayWins), color: 'bg-gold' },
                ].map(row => (
                  <div key={row.label}>
                    <div className="mb-1 flex justify-between">
                      <span className="max-w-[60%] truncate text-xs font-bold text-fg-2">{row.label}</span>
                      <span className="font-mono text-xs text-fg-3">{row.p}% ({row.count})</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                      <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.p}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* League picks */}
          {peerPredictions.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface-1 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-fg-3">League picks</p>
              <div className="space-y-2">
                {peerPredictions.map(pred => {
                  const username = userMap[pred.user_id] ?? 'Unknown'
                  const pts = pred.points_earned
                  return (
                    <div key={pred.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-border text-xs font-bold text-fg-1">
                          {username[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm font-bold text-fg-1">{username}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-black text-fg-1">{pred.predicted_home_score}–{pred.predicted_away_score}</span>
                        {pts !== null && (
                          <span className={`font-mono text-sm font-black ${pts > 0 ? 'text-goal' : 'text-fg-3'}`}>
                            {pts > 0 ? `+${pts}` : '—'}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!myPrediction && total === 0 && peerPredictions.length === 0 && (
            <div className="rounded-2xl border border-border bg-surface-1 p-8 text-center">
              <p className="text-fg-3">No picks yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
