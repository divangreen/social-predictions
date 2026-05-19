// WC 2026 knockout bracket structure
// NOTE: Verify R32 cross-group pairings against official FIFA announcement before June 11
// 48 teams → 32 advance (24 group 1st/2nd + 8 best 3rd place) → knockout

import { WC2026_GROUPS } from './wc2026-groups'

export type BracketRound = 'r32' | 'r16' | 'qf' | 'sf' | 'final'

// R32 matchup seeds — "1A" = Group A winner, "2B" = Group B runner-up, "3rd-N" = Nth 3rd-place qualifier
export const R32_SEEDS: [string, string][] = [
  ['1A', '2B'],
  ['1C', '2D'],
  ['1E', '2F'],
  ['1G', '2H'],
  ['1I', '2J'],
  ['1K', '2L'],
  ['1B', '2A'],
  ['1D', '2C'],
  ['1F', '2E'],
  ['1H', '2G'],
  ['1J', '2I'],
  ['1L', '2K'],
  ['3rd-1', '3rd-2'],
  ['3rd-3', '3rd-4'],
  ['3rd-5', '3rd-6'],
  ['3rd-7', '3rd-8'],
]

export const ROUND_SIZES: Record<BracketRound, number> = {
  r32: 16, r16: 8, qf: 4, sf: 2, final: 1,
}

export const ROUND_LABELS: Record<BracketRound, string> = {
  r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-finals', sf: 'Semi-finals', final: 'Final',
}

export const ROUND_POINTS: Record<BracketRound, number> = {
  r32: 1, r16: 2, qf: 4, sf: 8, final: 16,
}

export const KNOCKOUT_ROUNDS: BracketRound[] = ['r32', 'r16', 'qf', 'sf', 'final']

export type KnockoutPicks = {
  thirdQualifiers: (string | null)[]  // 8 slots
  r32: (string | null)[]              // 16 winners
  r16: (string | null)[]              // 8 winners
  qf: (string | null)[]               // 4 winners
  sf: (string | null)[]               // 2 winners
  champion: string | null
  topScorer?: string | null
}

export function emptyKnockoutPicks(): KnockoutPicks {
  return {
    thirdQualifiers: Array(8).fill(null),
    r32: Array(16).fill(null),
    r16: Array(8).fill(null),
    qf: Array(4).fill(null),
    sf: Array(2).fill(null),
    champion: null,
  }
}

// Resolve which team occupies each R32 slot, given group picks and 3rd-place qualifiers
export function resolveR32Teams(
  groupPicks: Map<string, { first_place: string; second_place: string }>,
  thirdQualifiers: (string | null)[]
): [string | null, string | null][] {
  const resolve = (seed: string): string | null => {
    if (seed.startsWith('3rd-')) {
      const idx = parseInt(seed.slice(4)) - 1
      return thirdQualifiers[idx] ?? null
    }
    const pos = parseInt(seed[0]) // 1 or 2
    const group = seed[1]         // A-L
    const pick = groupPicks.get(group)
    if (!pick) return null
    return pos === 1 ? pick.first_place : pick.second_place
  }
  return R32_SEEDS.map(([top, bottom]) => [resolve(top), resolve(bottom)])
}

// Return the two teams that could win a given match in a given round
// (from the previous round's results)
export function getMatchTeams(
  matchIdx: number,
  round: BracketRound,
  picks: KnockoutPicks,
  r32Teams: [string | null, string | null][]
): [string | null, string | null] {
  if (round === 'r32') return r32Teams[matchIdx]
  const prevRound = KNOCKOUT_ROUNDS[KNOCKOUT_ROUNDS.indexOf(round) - 1] as Exclude<BracketRound, 'final'>
  const prevPicks = prevRound === 'r32' ? picks.r32
    : prevRound === 'r16' ? picks.r16
    : prevRound === 'qf' ? picks.qf
    : picks.sf
  return [prevPicks[matchIdx * 2] ?? null, prevPicks[matchIdx * 2 + 1] ?? null]
}

// Get all teams not picked as 1st or 2nd in their group (potential 3rd-place finishers)
export function getThirdPlaceCandidates(
  groupPicks: Map<string, { first_place: string; second_place: string }>
): { group: string; teams: string[] }[] {
  return WC2026_GROUPS.map(g => {
    const pick = groupPicks.get(g.letter)
    if (!pick) return { group: g.letter, teams: [...g.teams] }
    return {
      group: g.letter,
      teams: g.teams.filter(t => t !== pick.first_place && t !== pick.second_place),
    }
  })
}
