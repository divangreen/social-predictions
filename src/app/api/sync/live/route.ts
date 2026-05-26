import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'

// Rapid sync for fixtures currently in 'live' status.
// Designed to run every 5 minutes via Vercel cron during active tournament days.
// Only re-fetches fixtures for tournaments that have at least one live fixture,
// which keeps API call counts extremely low on non-match days.

function makeSupabase() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const querySecret = request.nextUrl.searchParams.get('secret')
  const cronSecret = process.env.CRON_SECRET
  const syncSecret = process.env.SYNC_SECRET

  const authorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (syncSecret && querySecret === syncSecret)

  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = makeSupabase()

  // Find tournaments that currently have live fixtures
  const { data: liveFixtures } = await supabase
    .from('fixtures')
    .select('tournament_id')
    .eq('status', 'live')

  if (!liveFixtures?.length) {
    return NextResponse.json({ ok: true, message: 'No live fixtures', synced: 0 })
  }

  const tournamentIds = [...new Set(liveFixtures.map(f => f.tournament_id))]

  // Forward each live tournament to the main sync endpoint
  const base = new URL('/api/sync', request.url).toString()
  const secret = querySecret ?? ''
  const results: Record<string, unknown> = {}

  // Map known tournament IDs to their provider params
  const TOURNAMENT_MAP: Record<string, { league_id: string; season: string }> = {
    '4429': { league_id: '4429', season: '2026' },
    nba: { league_id: 'nba', season: '2025-2026' },
    CL: { league_id: 'CL', season: '2025-2026' },
    PL: { league_id: 'PL', season: '2025-2026' },
    PD: { league_id: 'PD', season: '2025-2026' },
  }

  for (const tournamentId of tournamentIds) {
    const params = TOURNAMENT_MAP[tournamentId]
    if (!params) {
      results[tournamentId] = { skipped: true, reason: 'unknown tournament' }
      continue
    }
    try {
      const url = `${base}?league_id=${params.league_id}&season=${encodeURIComponent(params.season)}&secret=${secret}`
      const res = await fetch(url, { headers: request.headers })
      results[tournamentId] = await res.json()
    } catch (e) {
      results[tournamentId] = { error: String(e) }
    }
  }

  return NextResponse.json({ ok: true, liveTournaments: tournamentIds.length, results })
}
