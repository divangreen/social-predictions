'use client'

import { useState, useTransition } from 'react'
import {
  type KnockoutPicks,
  type BracketRound,
  KNOCKOUT_ROUNDS,
  ROUND_LABELS,
  ROUND_SIZES,
  emptyKnockoutPicks,
  resolveR32Teams,
  getMatchTeams,
  getThirdPlaceCandidates,
} from '@/lib/wc2026-bracket'
import { saveKnockoutPicks } from './actions'

type GroupPick = { first_place: string; second_place: string }

function clonePicks(p: KnockoutPicks): KnockoutPicks {
  return {
    thirdQualifiers: [...p.thirdQualifiers],
    r32: [...p.r32],
    r16: [...p.r16],
    qf: [...p.qf],
    sf: [...p.sf],
    champion: p.champion,
  }
}

// Cascade-clear all downstream picks that depended on the old team at this position
function cascadeClear(
  picks: KnockoutPicks,
  round: Exclude<BracketRound, 'final'> | 'thirdQualifiers',
  matchIdx: number,
  oldTeam: string | null
): KnockoutPicks {
  if (!oldTeam) return picks
  const p = clonePicks(picks)

  // Map round name to the picks array and the next round
  const chain: Array<{ arr: (string | null)[]; key: keyof KnockoutPicks }> = [
    { arr: p.r32, key: 'r32' },
    { arr: p.r16, key: 'r16' },
    { arr: p.qf, key: 'qf' },
    { arr: p.sf, key: 'sf' },
  ]

  const startIdx = round === 'thirdQualifiers' ? 0 // thirdQualifiers → r32
    : chain.findIndex(c => c.key === round) + 1

  let currentMatch = round === 'thirdQualifiers'
    ? 11 + Math.floor(matchIdx / 2) // 3rd qualifier slots map to r32 matches 12-15
    : Math.floor(matchIdx / 2)
  let teamToClear = oldTeam

  for (let i = startIdx; i < chain.length; i++) {
    const { arr, key } = chain[i]
    if (arr[currentMatch] === teamToClear) {
      arr[currentMatch] = null
      ;(p[key] as (string | null)[])[currentMatch] = null
      currentMatch = Math.floor(currentMatch / 2)
    } else {
      break
    }
  }
  if (p.champion === teamToClear) p.champion = null
  return p
}

type Props = {
  groupPicks: Map<string, GroupPick>
  initial: KnockoutPicks
  locked: boolean
}

export default function KnockoutBracket({ groupPicks, initial, locked }: Props) {
  const [picks, setPicks] = useState<KnockoutPicks>(initial)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const hasGroupPicks = groupPicks.size === 12

  const thirdCandidates = getThirdPlaceCandidates(groupPicks)
  const r32Teams = resolveR32Teams(groupPicks, picks.thirdQualifiers)

  function pickThird(slotIdx: number, team: string) {
    if (locked) return
    setPicks(prev => {
      const oldTeam = prev.thirdQualifiers[slotIdx]
      const p = clonePicks(prev)
      // If this team is already in another slot, swap
      const existingSlot = p.thirdQualifiers.findIndex(t => t === team)
      if (existingSlot !== -1 && existingSlot !== slotIdx) p.thirdQualifiers[existingSlot] = null
      p.thirdQualifiers[slotIdx] = team
      // Cascade clear: this slot maps to r32 match 12 + floor(slotIdx/2)
      return cascadeClear(p, 'thirdQualifiers', slotIdx, oldTeam)
    })
    setSaved(false)
  }

  function pickWinner(round: Exclude<BracketRound, 'final'>, matchIdx: number, team: string) {
    if (locked) return
    setPicks(prev => {
      const arr = prev[round] as (string | null)[]
      const oldTeam = arr[matchIdx]
      if (oldTeam === team) return prev
      const p = cascadeClear(clonePicks(prev), round, matchIdx, oldTeam)
      ;(p[round] as (string | null)[])[matchIdx] = team
      return p
    })
    setSaved(false)
  }

  function pickChampion(team: string) {
    if (locked) return
    setPicks(prev => ({ ...prev, champion: prev.champion === team ? null : team }))
    setSaved(false)
  }

  function handleSave() {
    setSaveError(null)
    startTransition(async () => {
      const result = await saveKnockoutPicks(picks)
      if (result?.error) setSaveError(result.error === 'locked' ? 'Predictions are locked.' : 'Something went wrong. Try again.')
      else setSaved(true)
    })
  }

  const filledThird = picks.thirdQualifiers.filter(Boolean).length
  const allTeams = thirdCandidates.flatMap(c => c.teams)
  const usedThird = new Set(picks.thirdQualifiers.filter(Boolean) as string[])

  return (
    <div className="space-y-8">

      {!hasGroupPicks && (
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-400">
          Submit your group stage picks first — they determine who can advance.
        </div>
      )}

      {/* Third-place qualifiers */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">
            3rd Place Qualifiers
          </h2>
          <span className="text-xs text-zinc-600">{filledThird}/8 picked</span>
        </div>
        <p className="mb-4 text-xs text-zinc-600">Pick 8 third-place teams that advance to the Round of 32.</p>
        <div className="grid grid-cols-2 gap-2">
          {picks.thirdQualifiers.map((selected, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-2">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600">Slot {i + 1}</p>
              <select
                disabled={locked}
                value={selected ?? ''}
                onChange={e => pickThird(i, e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white outline-none disabled:opacity-40"
              >
                <option value="">Pick team…</option>
                {thirdCandidates.map(({ group, teams }) => (
                  <optgroup key={group} label={`Group ${group}`}>
                    {teams.map(t => (
                      <option key={t} value={t} disabled={usedThird.has(t) && t !== selected}>
                        {t}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      {/* Knockout rounds */}
      {KNOCKOUT_ROUNDS.filter(r => r !== 'final').map((round) => {
        const roundPicks = picks[round] as (string | null)[]
        const size = ROUND_SIZES[round]
        return (
          <section key={round}>
            <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">
              {ROUND_LABELS[round]}
            </h2>
            <div className="space-y-2">
              {Array.from({ length: size }, (_, i) => {
                const [teamA, teamB] = getMatchTeams(i, round, picks, r32Teams)
                const winner = roundPicks[i]
                return (
                  <div key={i} className="flex overflow-hidden rounded-xl border border-zinc-800">
                    <TeamButton
                      team={teamA}
                      selected={winner === teamA}
                      disabled={locked || !teamA || !teamB}
                      onClick={() => teamA && pickWinner(round as Exclude<BracketRound, 'final'>, i, teamA)}
                    />
                    <div className="flex items-center justify-center px-2 text-[10px] font-black text-zinc-600">
                      vs
                    </div>
                    <TeamButton
                      team={teamB}
                      selected={winner === teamB}
                      disabled={locked || !teamA || !teamB}
                      onClick={() => teamB && pickWinner(round as Exclude<BracketRound, 'final'>, i, teamB)}
                    />
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {/* Final / Champion */}
      <section>
        <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">Final — Champion</h2>
        {(() => {
          const [teamA, teamB] = getMatchTeams(0, 'final', picks, r32Teams)
          return (
            <div className="flex overflow-hidden rounded-xl border border-zinc-700">
              <TeamButton
                team={teamA}
                selected={picks.champion === teamA}
                disabled={locked || !teamA || !teamB}
                onClick={() => teamA && pickChampion(teamA)}
                highlight
              />
              <div className="flex items-center justify-center px-2 text-[10px] font-black text-zinc-600">vs</div>
              <TeamButton
                team={teamB}
                selected={picks.champion === teamB}
                disabled={locked || !teamA || !teamB}
                onClick={() => teamB && pickChampion(teamB)}
                highlight
              />
            </div>
          )
        })()}
        {picks.champion && (
          <p className="mt-3 text-center text-sm font-bold text-white">
            Your champion: {picks.champion}
          </p>
        )}
      </section>

      {/* Save */}
      {!locked && (
        <div className="pb-8">
          {saveError && (
            <p className="mb-3 rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-400">{saveError}</p>
          )}
          {saved && (
            <p className="mb-3 rounded-xl bg-green-500/10 px-4 py-2 text-sm text-green-400">
              Picks saved!
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full rounded-2xl bg-white py-4 text-sm font-black text-black transition hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? 'Saving…' : saved ? 'Update picks' : 'Save bracket picks'}
          </button>
        </div>
      )}
    </div>
  )
}

function TeamButton({
  team,
  selected,
  disabled,
  onClick,
  highlight = false,
}: {
  team: string | null
  selected: boolean
  disabled: boolean
  onClick: () => void
  highlight?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 px-3 py-3 text-left text-xs font-bold transition
        ${selected
          ? highlight
            ? 'bg-yellow-400 text-black'
            : 'bg-white text-black'
          : 'bg-zinc-900 text-zinc-300'}
        ${disabled ? 'cursor-default opacity-40' : 'hover:bg-zinc-700'}
        ${selected && !disabled ? '' : ''}
      `}
    >
      {team ?? '—'}
    </button>
  )
}
