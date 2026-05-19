import OpenAI from 'openai'

type PredictionForBanter = {
  username: string
  predictedHome: number
  predictedAway: number
  correct: boolean
  perfect: boolean
}

export async function generateFixtureBanter(
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  predictions: PredictionForBanter[]
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  try {
    const openai = new OpenAI({ apiKey })

    const predLines = predictions
      .slice(0, 6)
      .map(p => {
        const tag = p.perfect ? '🎯 perfect' : p.correct ? '✓ correct' : '✗ wrong'
        return `${p.username} predicted ${p.predictedHome}-${p.predictedAway} (${tag})`
      })
      .join('; ')

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 60,
      temperature: 0.9,
      messages: [
        {
          role: 'system',
          content:
            'You write one-line banter for a sports prediction group chat. Be witty, punchy, and specific. Call out who got it right or embarrassingly wrong. No hashtags. No emojis at the start. Max 20 words.',
        },
        {
          role: 'user',
          content: `Result: ${homeTeam} ${homeScore}-${awayScore} ${awayTeam}. Predictions: ${predLines}`,
        },
      ],
    })

    return response.choices[0]?.message?.content?.trim() ?? null
  } catch {
    return null
  }
}
