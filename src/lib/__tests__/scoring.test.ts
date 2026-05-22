import { describe, it, expect } from 'vitest'
import { calcPoints, getResult } from '../scoring'

// ─── getResult ────────────────────────────────────────────────────────────────

describe('getResult', () => {
  it('home win', () => expect(getResult(2, 0)).toBe('home'))
  it('away win', () => expect(getResult(0, 1)).toBe('away'))
  it('draw', () => expect(getResult(1, 1)).toBe('draw'))
  it('0-0 draw', () => expect(getResult(0, 0)).toBe('draw'))
  it('high-scoring home win', () => expect(getResult(105, 98)).toBe('home'))
})

// ─── Score pick — new point values ───────────────────────────────────────────

describe('calcPoints — score pick (5/2 system)', () => {
  it('awards 5pts for exact scoreline', () => {
    expect(calcPoints({ type: 'score', predictedHome: 2, predictedAway: 1 }, 2, 1, false).points).toBe(5)
  })

  it('marks exact as isExact=true', () => {
    expect(calcPoints({ type: 'score', predictedHome: 2, predictedAway: 1 }, 2, 1, false).isExact).toBe(true)
  })

  it('awards 2pts for correct result, wrong score — home win', () => {
    expect(calcPoints({ type: 'score', predictedHome: 3, predictedAway: 1 }, 2, 0, false).points).toBe(2)
  })

  it('awards 2pts for correct result — draw', () => {
    expect(calcPoints({ type: 'score', predictedHome: 1, predictedAway: 1 }, 0, 0, false).points).toBe(2)
  })

  it('awards 2pts for correct result — away win', () => {
    expect(calcPoints({ type: 'score', predictedHome: 0, predictedAway: 2 }, 0, 1, false).points).toBe(2)
  })

  it('awards 0pts for wrong result', () => {
    expect(calcPoints({ type: 'score', predictedHome: 2, predictedAway: 0 }, 0, 1, false).points).toBe(0)
  })

  it('awards 0pts — predicted draw, actual home win', () => {
    expect(calcPoints({ type: 'score', predictedHome: 1, predictedAway: 1 }, 2, 0, false).points).toBe(0)
  })

  it('exact 0-0 awards 5pts', () => {
    expect(calcPoints({ type: 'score', predictedHome: 0, predictedAway: 0 }, 0, 0, false).points).toBe(5)
  })

  it('isExact=false for correct result but wrong score', () => {
    expect(calcPoints({ type: 'score', predictedHome: 3, predictedAway: 1 }, 2, 0, false).isExact).toBe(false)
  })
})

// ─── Result pick ──────────────────────────────────────────────────────────────

describe('calcPoints — result pick (2pt system)', () => {
  it('awards 2pts for correct home pick', () => {
    expect(calcPoints({ type: 'result', predictedResult: 'home' }, 2, 0, false).points).toBe(2)
  })

  it('awards 2pts for correct draw pick', () => {
    expect(calcPoints({ type: 'result', predictedResult: 'draw' }, 0, 0, false).points).toBe(2)
  })

  it('awards 2pts for correct away pick', () => {
    expect(calcPoints({ type: 'result', predictedResult: 'away' }, 0, 1, false).points).toBe(2)
  })

  it('awards 0pts for wrong result pick', () => {
    expect(calcPoints({ type: 'result', predictedResult: 'home' }, 0, 1, false).points).toBe(0)
  })

  it('awards 0pts for wrong draw pick', () => {
    expect(calcPoints({ type: 'result', predictedResult: 'draw' }, 2, 1, false).points).toBe(0)
  })

  it('is never exact', () => {
    expect(calcPoints({ type: 'result', predictedResult: 'home' }, 2, 0, false).isExact).toBe(false)
  })
})

// ─── Upset bonus ─────────────────────────────────────────────────────────────

describe('calcPoints — upset bonus', () => {
  it('score pick exact + underdog win = 6pts', () => {
    expect(calcPoints({ type: 'score', predictedHome: 1, predictedAway: 0 }, 1, 0, true).points).toBe(6)
  })

  it('score pick correct result + underdog win = 3pts', () => {
    expect(calcPoints({ type: 'score', predictedHome: 2, predictedAway: 0 }, 1, 0, true).points).toBe(3)
  })

  it('result pick correct + underdog win = 3pts', () => {
    expect(calcPoints({ type: 'result', predictedResult: 'home' }, 1, 0, true).points).toBe(3)
  })

  it('no upset bonus on wrong result — score pick', () => {
    expect(calcPoints({ type: 'score', predictedHome: 1, predictedAway: 1 }, 1, 0, true).points).toBe(0)
  })

  it('no upset bonus on wrong result — result pick', () => {
    expect(calcPoints({ type: 'result', predictedResult: 'draw' }, 1, 0, true).points).toBe(0)
  })

  it('no upset bonus when isUnderdogWin=false', () => {
    expect(calcPoints({ type: 'score', predictedHome: 2, predictedAway: 1 }, 2, 1, false).points).toBe(5)
  })
})

// ─── Score pick > result pick incentive ──────────────────────────────────────

describe('calcPoints — score pick earns strictly more than result pick on exact', () => {
  it('exact score (5pts) beats result-only correct (2pts)', () => {
    const scorePts = calcPoints({ type: 'score', predictedHome: 2, predictedAway: 1 }, 2, 1, false).points
    const resultPts = calcPoints({ type: 'result', predictedResult: 'home' }, 2, 1, false).points
    expect(scorePts).toBeGreaterThan(resultPts)
  })

  it('correct result from score pick equals correct result pick (both 2pts)', () => {
    const scorePts = calcPoints({ type: 'score', predictedHome: 3, predictedAway: 1 }, 2, 0, false).points
    const resultPts = calcPoints({ type: 'result', predictedResult: 'home' }, 2, 0, false).points
    expect(scorePts).toBe(resultPts)
  })
})

// ─── Delta / idempotency ─────────────────────────────────────────────────────

describe('calcPoints — re-scoring deltas', () => {
  it('zero delta when re-scoring same exact result', () => {
    const old = 5
    const next = calcPoints({ type: 'score', predictedHome: 2, predictedAway: 1 }, 2, 1, false).points
    expect(next - old).toBe(0)
  })

  it('negative delta when score is corrected downward', () => {
    const old = 2
    const next = calcPoints({ type: 'score', predictedHome: 2, predictedAway: 0 }, 0, 1, false).points
    expect(next - old).toBe(-2)
  })

  it('positive delta when score is corrected upward', () => {
    const old = 0
    const next = calcPoints({ type: 'score', predictedHome: 2, predictedAway: 1 }, 2, 1, false).points
    expect(next - old).toBe(5)
  })

  it('result pick zero delta on re-score', () => {
    const old = 2
    const next = calcPoints({ type: 'result', predictedResult: 'home' }, 2, 0, false).points
    expect(next - old).toBe(0)
  })
})
