'use client'

import { useState } from 'react'
import type { NbaPlayerStat, NbaTeamStat } from '@/lib/match-details'

interface Props {
  homeTeam: string
  awayTeam: string
  homeLogo: string | null
  awayLogo: string | null
  homePlayers: NbaPlayerStat[]
  awayPlayers: NbaPlayerStat[]
  teamStats: NbaTeamStat[]
  myPrediction: { predicted_home_score: number | null; predicted_away_score: number | null; points_earned: number | null; is_perfect: boolean | null } | null
  peerPredictions: { id: string; user_id: string; predicted_home_score: number | null; predicted_away_score: number | null; points_earned: number | null }[]
  userMap: Record<string, string>
  allPreds: { predicted_home_score: number | null; predicted_away_score: number | null }[]
  isCompleted: boolean
}

type Tab = 'home' | 'away' | 'stats' | 'picks'

const COL_HEADERS = ['MIN', 'PTS', 'FG', '3PT', 'FT', 'REB', 'AST', 'STL', 'BLK', 'TO', 'PF']

function statVal(p: NbaPlayerStat, col: string): string {
  switch (col) {
    case 'MIN': return p.min?.split(':')[0] ?? '0'
    case 'PTS': return String(p.pts)
    case 'FG':  return `${p.fgm}-${p.fga}`
    case '3PT': return `${p.fg3m}-${p.fg3a}`
    case 'FT':  return `${p.ftm}-${p.fta}`
    case 'REB': return String(p.reb)
    case 'AST': return String(p.ast)
    case 'STL': return String(p.stl)
    case 'BLK': return String(p.blk)
    case 'TO':  return String(p.to)
    case 'PF':  return String(p.pf)
    default: return '—'
  }
}

function PlayerTable({ players, teamName }: { players: NbaPlayerStat[]; teamName: string }) {
  const active = players.filter(p => !p.dnp)
  const dnp = players.filter(p => p.dnp)

  if (!active.length) {
    return <p className="py-8 text-center text-fg-3">No player data available</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-left">
        <thead>
          <tr className="border-b border-border">
            <th className="py-2 pr-3 text-left text-[10px] font-bold uppercase tracking-wider text-fg-3 sticky left-0 bg-surface-1 min-w-[120px]">Player</th>
            {COL_HEADERS.map(h => (
              <th key={h} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-fg-3 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {active.map((p, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-surface-2/50 transition">
              <td className="py-2.5 pr-3 sticky left-0 bg-surface-1">
                <p className="text-sm font-bold text-fg-1 whitespace-nowrap">{p.name}</p>
              </td>
              {COL_HEADERS.map(col => (
                <td key={col} className={`px-2 py-2.5 text-center font-mono text-sm whitespace-nowrap ${col === 'PTS' ? 'font-black text-fg-1' : 'text-fg-2'}`}>
                  {statVal(p, col)}
                </td>
              ))}
            </tr>
          ))}
          {dnp.length > 0 && (
            <>
              <tr><td colSpan={12} className="pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-fg-3">Did Not Play</td></tr>
              {dnp.map((p, i) => (
                <tr key={`dnp-${i}`} className="opacity-40">
                  <td className="py-1.5 pr-3 sticky left-0 bg-surface-1">
                    <p className="text-sm text-fg-2">{p.name}</p>
                  </td>
                  {COL_HEADERS.map(col => (
                    <td key={col} className="px-2 py-1.5 text-center font-mono text-sm text-fg-3">—</td>
                  ))}
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}

function TeamStatsTable({ stats, homeLogo, awayLogo, homeTeam, awayTeam }: {
  stats: NbaTeamStat[]
  homeLogo: string | null
  awayLogo: string | null
  homeTeam: string
  awayTeam: string
}) {
  if (!stats.length) return <p className="py-8 text-center text-fg-3">Stats not available</p>

  // Group by section
  const shooting = stats.slice(0, 6)
  const other = stats.slice(6)

  return (
    <div>
      {/* Team header row */}
      <div className="mb-3 flex items-center">
        <div className="flex flex-1 items-center gap-2">
          {homeLogo && <img src={homeLogo} alt={homeTeam} className="h-8 w-8 object-contain" />}
          <span className="text-xs font-black uppercase tracking-wider text-fg-1">{homeTeam}</span>
        </div>
        <span className="w-24 text-center text-[10px] font-bold uppercase tracking-wider text-fg-3 sm:w-32">Team Stats</span>
        <div className="flex flex-1 items-center justify-end gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-fg-1">{awayTeam}</span>
          {awayLogo && <img src={awayLogo} alt={awayTeam} className="h-8 w-8 object-contain" />}
        </div>
      </div>

      {/* Shooting section */}
      <div className="mb-2 rounded-2xl border border-border bg-surface-1 overflow-hidden">
        {shooting.map((row, i) => (
          <div key={row.label} className={`flex items-center px-4 py-2.5 ${i > 0 ? 'border-t border-border/50' : ''}`}>
            <span className="flex-1 font-mono text-sm font-bold text-fg-1">{row.home}</span>
            <span className="w-28 text-center text-xs font-bold text-fg-3 sm:w-40">{row.label}</span>
            <span className="flex-1 text-right font-mono text-sm font-bold text-fg-1">{row.away}</span>
          </div>
        ))}
      </div>

      {/* Other stats */}
      <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
        {other.map((row, i) => (
          <div key={row.label} className={`flex items-center px-4 py-2.5 ${i > 0 ? 'border-t border-border/50' : ''}`}>
            <span className="flex-1 font-mono text-sm font-bold text-fg-1">{row.home}</span>
            <span className="w-28 text-center text-xs font-bold text-fg-3 sm:w-40">{row.label}</span>
            <span className="flex-1 text-right font-mono text-sm font-bold text-fg-1">{row.away}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function NbaTabs({
  homeTeam, awayTeam, homeLogo, awayLogo,
  homePlayers, awayPlayers, teamStats,
  myPrediction, peerPredictions, userMap, allPreds, isCompleted,
}: Props) {
  const [tab, setTab] = useState<Tab>('home')

  const myPts = myPrediction?.points_earned ?? 0
  const total = allPreds.length
  const homeWins = allPreds.filter(p => (p.predicted_home_score ?? 0) > (p.predicted_away_score ?? 0)).length
  const draws = allPreds.filter(p => (p.predicted_home_score ?? 0) === (p.predicted_away_score ?? 0)).length
  const awayWins = allPreds.filter(p => (p.predicted_home_score ?? 0) < (p.predicted_away_score ?? 0)).length
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0

  const tabs: { key: Tab; label: string }[] = [
    { key: 'home', label: homeTeam },
    { key: 'away', label: awayTeam },
    { key: 'stats', label: 'Stats' },
    { key: 'picks', label: 'Picks' },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-4 flex overflow-x-auto border-b border-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 max-w-[8rem] truncate px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
              tab === t.key ? 'border-b-2 border-gold text-gold' : 'text-fg-3 hover:text-fg-2'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'home' && (
        <div className="rounded-2xl border border-border bg-surface-1 p-3 overflow-hidden">
          <PlayerTable players={homePlayers} teamName={homeTeam} />
        </div>
      )}

      {tab === 'away' && (
        <div className="rounded-2xl border border-border bg-surface-1 p-3 overflow-hidden">
          <PlayerTable players={awayPlayers} teamName={awayTeam} />
        </div>
      )}

      {tab === 'stats' && (
        <TeamStatsTable
          stats={teamStats}
          homeLogo={homeLogo}
          awayLogo={awayLogo}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />
      )}

      {tab === 'picks' && (
        <div className="space-y-3">
          {myPrediction && (
            <div className={`rounded-2xl border p-4 ${isCompleted && myPts > 0 ? 'border-goal/25 bg-goal/5' : 'border-border bg-surface-1'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-fg-3 mb-1">My prediction</p>
                  <p className="font-mono text-xl font-black text-fg-1">{myPrediction.predicted_home_score} – {myPrediction.predicted_away_score}</p>
                  {isCompleted && (
                    <p className="mt-1 text-sm font-bold">
                      {myPrediction.is_perfect ? <span className="text-goal">🎯 Perfect!</span>
                        : myPts > 0 ? <span className="text-goal">✅ Correct result</span>
                        : <span className="text-fg-3">✗ Missed</span>}
                    </p>
                  )}
                </div>
                {isCompleted && <span className="font-mono text-2xl font-black text-gold">+{myPts}</span>}
              </div>
            </div>
          )}

          {total > 0 && (
            <div className="rounded-2xl border border-border bg-surface-1 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-fg-3">Community · {total} picks</p>
              {[
                { label: homeTeam, count: homeWins, p: pct(homeWins), color: 'bg-info' },
                { label: 'Draw', count: draws, p: pct(draws), color: 'bg-fg-3' },
                { label: awayTeam, count: awayWins, p: pct(awayWins), color: 'bg-gold' },
              ].map(row => (
                <div key={row.label} className="mb-2.5">
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
          )}

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
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-border text-xs font-bold text-fg-1">{username[0]?.toUpperCase()}</div>
                        <span className="text-sm font-bold text-fg-1">{username}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-black text-fg-1">{pred.predicted_home_score}–{pred.predicted_away_score}</span>
                        {pts !== null && <span className={`font-mono text-sm font-black ${pts > 0 ? 'text-goal' : 'text-fg-3'}`}>{pts > 0 ? `+${pts}` : '—'}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
