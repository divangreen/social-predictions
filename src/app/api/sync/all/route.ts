import { NextRequest, NextResponse } from 'next/server'

const LEAGUES = [
  { league_id: '4429', season: '2026',      label: 'FIFA World Cup 2026' },    // TheSportsDB
  { league_id: 'CL',   season: '2025-2026', label: 'UEFA Champions League' },  // football-data.org
  { league_id: 'PL',   season: '2025-2026', label: 'English Premier League' }, // football-data.org
  { league_id: 'PD',   season: '2025-2026', label: 'Spanish La Liga' },        // football-data.org
  { league_id: 'nba',  season: '2025-2026', label: 'NBA' },                    // balldontlie.io
]

export async function GET(request: NextRequest) {
  // Auth: Vercel cron header OR manual secret
  const authHeader = request.headers.get('authorization')
  const querySecret = request.nextUrl.searchParams.get('secret')
  const cronSecret = process.env.CRON_SECRET
  const syncSecret = process.env.SYNC_SECRET

  const authorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (syncSecret && querySecret === syncSecret)

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const base = new URL('/api/sync', request.url).toString()
  const secret = querySecret ?? ''
  const results: Record<string, unknown> = {}

  for (const { league_id, season, label } of LEAGUES) {
    try {
      const url = `${base}?league_id=${league_id}&season=${encodeURIComponent(season)}&secret=${secret}`
      const res = await fetch(url, { headers: request.headers })
      results[label] = await res.json()
    } catch (e) {
      results[label] = { error: String(e) }
    }
  }

  return NextResponse.json({ ok: true, results })
}
