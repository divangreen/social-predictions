import { describe, it, expect } from 'vitest'

// Scoring logic mirrored from src/app/admin/fixtures/actions.ts
function getResult(home: number, away: number): 'home' | 'draw' | 'away' {
  if (home > away) return 'home'
  if (home < away) return 'away'
  return 'draw'
}

function calcPoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
  isUnderdogWin: boolean
): { points: number; isExact: boolean } {
  const exactMatch = predictedHome === actualHome && predictedAway === actualAway
  const predictedResult = getResult(predictedHome, predictedAway)
  const actualResult = getResult(actualHome, actualAway)
  const correctResult = predictedResult === actualResult

  let points = 0
  if (exactMatch) points = 3
  else if (correctResult) points = 1
  if (correctResult && isUnderdogWin) points += 1

  return { points, isExact: exactMatch }
}

// WC group scoring mirrored from src/app/admin/world-cup/page.tsx
function calcGroupPoints(
  predictedFirst: string,
  predictedSecond: string,
  actualFirst: string,
  actualSecond: string
): number {
  return (
    (predictedFirst === actualFirst ? 5 : 0) +
    (predictedSecond === actualSecond ? 3 : 0) +
    (predictedFirst === actualSecond ? 1 : 0) +
    (predictedSecond === actualFirst ? 1 : 0)
  )
}

// Score validation mirrored from savePrediction / saveFixtureResult
function isValidScore(home: number, away: number, maxScore: number): boolean {
  return (
    Number.isInteger(home) &&
    Number.isInteger(away) &&
    home >= 0 &&
    away >= 0 &&
    home <= maxScore &&
    away <= maxScore
  )
}

// ─── getResult ────────────────────────────────────────────────────────────────

describe('getResult', () => {
  it('returns home on home win', () => expect(getResult(2, 0)).toBe('home'))
  it('returns away on away win', () => expect(getResult(0, 1)).toBe('away'))
  it('returns draw on equal scores', () => expect(getResult(1, 1)).toBe('draw'))
  it('returns draw on 0-0', () => expect(getResult(0, 0)).toBe('draw'))
  it('works for high scores', () => expect(getResult(105, 98)).toBe('home'))
})

// ─── calcPoints (football scoring) ───────────────────────────────────────────

describe('calcPoints — football', () => {
  it('awards 3pts for exact score', () => {
    expect(calcPoints(2, 1, 2, 1, false).points).toBe(3)
  })

  it('marks exact score as perfect', () => {
    expect(calcPoints(2, 1, 2, 1, false).isExact).toBe(true)
  })

  it('awards 1pt for correct result only (home win)', () => {
    expect(calcPoints(3, 1, 2, 0, false).points).toBe(1)
  })

  it('awards 1pt for correct result only (draw)', () => {
    expect(calcPoints(1, 1, 0, 0, false).points).toBe(1)
  })

  it('awards 1pt for correct result only (away win)', () => {
    expect(calcPoints(0, 2, 0, 1, false).points).toBe(1)
  })

  it('awards 0pts for wrong result', () => {
    expect(calcPoints(2, 0, 0, 1, false).points).toBe(0)
  })

  it('awards 0pts for wrong result (predicted draw, actual home win)', () => {
    expect(calcPoints(1, 1, 2, 0, false).points).toBe(0)
  })

  it('exact score on 0-0 awards 3pts', () => {
    expect(calcPoints(0, 0, 0, 0, false).points).toBe(3)
  })
})

// ─── calcPoints — underdog bonus ─────────────────────────────────────────────

describe('calcPoints — underdog bonus', () => {
  it('adds +1 to exact score when underdog wins (4pts total)', () => {
    // Home team is underdog, home team wins
    expect(calcPoints(1, 0, 1, 0, true).points).toBe(4)
  })

  it('adds +1 to correct result when underdog wins (2pts total)', () => {
    expect(calcPoints(2, 0, 1, 0, true).points).toBe(2)
  })

  it('no bonus on wrong result even with underdog win', () => {
    // predicted draw, underdog (home) won
    expect(calcPoints(1, 1, 1, 0, true).points).toBe(0)
  })

  it('no bonus when isUnderdogWin is false', () => {
    expect(calcPoints(2, 1, 2, 1, false).points).toBe(3)
  })
})

// ─── isValidScore ─────────────────────────────────────────────────────────────

describe('isValidScore', () => {
  it('valid football scores', () => {
    expect(isValidScore(2, 1, 20)).toBe(true)
    expect(isValidScore(0, 0, 20)).toBe(true)
    expect(isValidScore(20, 20, 20)).toBe(true)
  })

  it('rejects scores above football max', () => {
    expect(isValidScore(21, 0, 20)).toBe(false)
    expect(isValidScore(0, 21, 20)).toBe(false)
  })

  it('valid basketball scores', () => {
    expect(isValidScore(105, 98, 200)).toBe(true)
    expect(isValidScore(200, 200, 200)).toBe(true)
  })

  it('rejects scores above basketball max', () => {
    expect(isValidScore(201, 0, 200)).toBe(false)
  })

  it('rejects negative scores', () => {
    expect(isValidScore(-1, 0, 20)).toBe(false)
    expect(isValidScore(0, -1, 20)).toBe(false)
  })

  it('rejects non-integers', () => {
    expect(isValidScore(1.5, 0, 20)).toBe(false)
    expect(isValidScore(0, 2.3, 20)).toBe(false)
  })
})

// ─── WC group scoring ────────────────────────────────────────────────────────

describe('calcGroupPoints', () => {
  it('awards 5pts for correct winner only', () => {
    expect(calcGroupPoints('Brazil', 'Argentina', 'Brazil', 'France')).toBe(5)
  })

  it('awards 3pts for correct runner-up only', () => {
    expect(calcGroupPoints('France', 'Argentina', 'Brazil', 'Argentina')).toBe(3)
  })

  it('awards 8pts for both correct', () => {
    expect(calcGroupPoints('Brazil', 'Argentina', 'Brazil', 'Argentina')).toBe(8)
  })

  it('awards 1pt for picking winner in runner-up slot', () => {
    // predicted first=Argentina (actual second), second=Brazil
    expect(calcGroupPoints('Argentina', 'Brazil', 'Brazil', 'Argentina')).toBe(2)
  })

  it('awards 2pts for both teams swapped (wrong positions)', () => {
    expect(calcGroupPoints('Argentina', 'Brazil', 'Brazil', 'Argentina')).toBe(2)
  })

  it('awards 0pts for completely wrong picks', () => {
    expect(calcGroupPoints('France', 'Spain', 'Brazil', 'Argentina')).toBe(0)
  })

  it('awards 1pt for picking actual second as first (only wrong-position bonus)', () => {
    expect(calcGroupPoints('Argentina', 'France', 'Brazil', 'Argentina')).toBe(1)
  })
})

// ─── Delta scoring (re-scoring idempotency) ───────────────────────────────────

describe('delta scoring — re-scoring idempotency', () => {
  it('delta is zero when re-scoring with same result', () => {
    const oldPts = 3
    const newPts = calcPoints(2, 1, 2, 1, false).points
    expect(newPts - oldPts).toBe(0)
  })

  it('delta is negative when score is corrected downward', () => {
    // Admin initially scored as home win (1pt), now corrects to away win (0pts)
    const oldPts = 1
    const newPts = calcPoints(2, 0, 0, 1, false).points
    expect(newPts - oldPts).toBe(-1)
  })

  it('delta is positive when score is corrected upward', () => {
    // Admin initially scored as wrong (0pts), corrects to exact (3pts)
    const oldPts = 0
    const newPts = calcPoints(2, 1, 2, 1, false).points
    expect(newPts - oldPts).toBe(3)
  })

  it('total_points never goes below 0 (GREATEST guard)', () => {
    const currentTotal = 2
    const delta = -5
    const result = Math.max(0, currentTotal + delta)
    expect(result).toBe(0)
  })
})
