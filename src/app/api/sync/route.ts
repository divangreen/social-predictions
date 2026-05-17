import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'

// Deterministic UUID from TheSportsDB event ID — allows safe upserts without schema changes
function eventIdToUuid(idEvent: string): string {
  return `00000000-0000-0000-0000-${idEvent.padStart(12, '0')}`
}

function normalizeStatus(strStatus: string, strPostponed: string): 'scheduled' | 'live' | 'completed' {
  if (strPostponed === 'yes') return 'scheduled'
  const s = strStatus?.toLowerCase() ?? ''
  if (s.includes('finished') || s.includes('complete') || s.includes('ft') || s === 'aet' || s === 'pen') return 'completed'
  if (s.includes('progress') || s === '1h' || s === '2h' || s === 'ht' || s === 'et' || s === 'live') return 'live'
  return 'scheduled'
}

function normalizeSport(strSport: string): string {
  const map: Record<string, string> = {
    soccer: 'football',
    football: 'football',
    basketball: 'basketball',
    cricket: 'cricket',
    'american football': 'american football',
    tennis: 'tennis',
    rugby: 'rugby',
  }
  return map[strSport?.toLowerCase()] ?? strSport?.toLowerCase() ?? 'football'
}

function normalizeTournamentStatus(events: TheSportsDBEvent[]): 'upcoming' | 'active' | 'completed' {
  const now = new Date()
  const hasLive = events.some(e => normalizeStatus(e.strStatus, e.strPostponed) === 'live')
  if (hasLive) return 'active'
  const hasFuture = events.some(e => new Date(e.strTimestamp) > now)
  const hasPast = events.some(e => normalizeStatus(e.strStatus, e.strPostponed) === 'completed')
  if (hasFuture && hasPast) return 'active'
  if (hasFuture) return 'upcoming'
  return 'completed'
}

interface TheSportsDBEvent {
  idEvent: string
  idLeague: string
  strLeague: string
  strSport: string
  strHomeTeam: string
  strAwayTeam: string
  strHomeTeamBadge: string | null
  strAwayTeamBadge: string | null
  strTimestamp: string
  intHomeScore: string | null
  intAwayScore: string | null
  strStatus: string
  strPostponed: string
  intRound: string | null
}

export async function GET(request: NextRequest) {
  // Auth: Vercel cron sends Authorization: Bearer <CRON_SECRET>
  // Manual trigger uses ?secret=<SYNC_SECRET>
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

  const leagueId = request.nextUrl.searchParams.get('league_id')
  const season = request.nextUrl.searchParams.get('season')

  if (!leagueId || !season) {
    return NextResponse.json({ error: 'Missing league_id or season' }, { status: 400 })
  }

  // Fetch from TheSportsDB (free, no key needed)
  const apiUrl = `https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=${leagueId}&s=${encodeURIComponent(season)}`
  const res = await fetch(apiUrl, { next: { revalidate: 0 } })
  if (!res.ok) {
    return NextResponse.json({ error: 'TheSportsDB fetch failed' }, { status: 502 })
  }

  const data = await res.json()
  const events: TheSportsDBEvent[] = data.events ?? []

  if (!events.length) {
    return NextResponse.json({ synced: 0, message: 'No events found' })
  }

  const first = events[0]
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // Upsert tournament
  const tournamentStatus = normalizeTournamentStatus(events)
  await supabase.from('tournaments').upsert(
    {
      id: leagueId,
      name: first.strLeague,
      sport: normalizeSport(first.strSport),
      status: tournamentStatus,
    },
    { onConflict: 'id' }
  )

  // Upsert fixtures in batches of 50
  const fixtures = events.map(e => {
    const status = normalizeStatus(e.strStatus, e.strPostponed)
    const homeScore = e.intHomeScore != null && e.intHomeScore !== '' ? parseInt(e.intHomeScore) : null
    const awayScore = e.intAwayScore != null && e.intAwayScore !== '' ? parseInt(e.intAwayScore) : null
    const stage = e.intRound ? `Round ${e.intRound}` : 'Group Stage'

    return {
      id: eventIdToUuid(e.idEvent),
      tournament_id: leagueId,
      home_team_name: e.strHomeTeam,
      away_team_name: e.strAwayTeam,
      home_team_logo: e.strHomeTeamBadge || null,
      away_team_logo: e.strAwayTeamBadge || null,
      kickoff_time: e.strTimestamp,
      status,
      home_score: status === 'completed' ? homeScore : null,
      away_score: status === 'completed' ? awayScore : null,
      stage,
      is_underdog_home: false,
      is_underdog_away: false,
    }
  })

  const BATCH = 50
  let synced = 0
  for (let i = 0; i < fixtures.length; i += BATCH) {
    const { error } = await supabase
      .from('fixtures')
      .upsert(fixtures.slice(i, i + BATCH), { onConflict: 'id' })
    if (!error) synced += Math.min(BATCH, fixtures.length - i)
  }

  return NextResponse.json({
    ok: true,
    tournament: first.strLeague,
    season,
    synced,
    total: fixtures.length,
  })
}
