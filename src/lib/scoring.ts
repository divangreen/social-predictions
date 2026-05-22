export type PredictionResult = 'home' | 'draw' | 'away'

export function getResult(home: number, away: number): PredictionResult {
  if (home > away) return 'home'
  if (home < away) return 'away'
  return 'draw'
}

export type ScorePick = { type: 'score'; predictedHome: number; predictedAway: number }
export type ResultPick = { type: 'result'; predictedResult: PredictionResult }
export type PredictionPick = ScorePick | ResultPick

/**
 * Points awarded:
 *   Result-only pick:  correct=2pts, wrong=0pts, +1 upset bonus
 *   Score pick exact:  5pts, +1 upset bonus
 *   Score pick result: 2pts (correct result, wrong score), +1 upset bonus
 *   Any miss:          0pts
 */
export function calcPoints(
  prediction: PredictionPick,
  actualHome: number,
  actualAway: number,
  isUnderdogWin: boolean,
): { points: number; isExact: boolean } {
  const actualResult = getResult(actualHome, actualAway)

  if (prediction.type === 'result') {
    const correct = prediction.predictedResult === actualResult
    return { points: correct ? (2 + (isUnderdogWin ? 1 : 0)) : 0, isExact: false }
  }

  const exactMatch =
    prediction.predictedHome === actualHome && prediction.predictedAway === actualAway
  const predictedResult = getResult(prediction.predictedHome, prediction.predictedAway)
  const correctResult = predictedResult === actualResult

  let points = 0
  if (exactMatch) points = 5
  else if (correctResult) points = 2
  if (correctResult && isUnderdogWin) points += 1

  return { points, isExact: exactMatch }
}
