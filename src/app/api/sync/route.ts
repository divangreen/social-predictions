import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'

// ─── UUID helpers ────────────────────────────────────────────────────────────

function sportsdbIdToUuid(idEvent: string): string {
  return `00000000-0000-0000-0000-${idEvent.padStart(12, '0')}`
}

function fdIdToUuid(matchId: number): string {
  return `00000000-0000-0001-0000-${String(matchId).padStart(12, '0')}`
}

// ─── Status normalizers ───────────────────────────────────────────────────────

function normalizeSportsdbStatus(strStatus: string, strPostponed: string): 'scheduled' | 'live' | 'completed' {
  if (strPostponed === 'yes') return 'scheduled'
  const s = strStatus?.toLowerCase() ?? ''
  if (s.includes('finished') || s.includes('complete') || s.includes('ft') || s === 'aet' || s === 'pen') return 'completed'
  if (s.includes('progress') || s === '1h' || s === '2h' || s === 'ht' || s === 'et' || s === 'live') return 'live'
  return 'scheduled'
}

function normalizeFdStatus(status: string): 'scheduled' | 'live' | 'completed' {
  if (status === 'FINISHED') return 'completed'
  if (status === 'IN_PLAY' || status === 'PAUSED' || status === 'HALFTIME') return 'live'
  return 'scheduled'
}

function normalizeSport(strSport: string): string {
  const map: Record<string, string> = {
    soccer: 'football', football: 'football', basketball: 'basketball',
    cricket: 'cricket', 'american football': 'american football', tennis: 'tennis', rugby: 'rugby',
  }
  return map[strSport?.toLowerCase()] ?? strSport?.toLowerCase() ?? 'football'
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SportsdbEvent {
  idEvent: string
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

interface BdlGame {
  id: number
  date: string
  status: string
  period: number
  home_team: { full_name: string; abbreviation: string }
  visitor_team: { full_name: string; abbreviation: string }
  home_team_score: number
  visitor_team_score: number
  postseason: boolean
}

interface FdMatch {
  id: number
  competition: { name: string }
  utcDate: string
  status: string
  matchday: number | null
  homeTeam: { name: string; shortName: string; crest: string | null }
  awayTeam: { name: string; shortName: string; crest: string | null }
  score: { fullTime: { home: number | null; away: number | null } }
}

// ─── Supabase client factory ──────────────────────────────────────────────────

function makeSupabase() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

// ─── Football-data.org sync ───────────────────────────────────────────────────

async function syncFromFootballData(leagueId: string, supabase: ReturnType<typeof makeSupabase>) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) throw new Error('FOOTBALL_DATA_API_KEY not set')

  const now = new Date()
  const dateFrom = new Date(now); dateFrom.setDate(dateFrom.getDate() - 30)
  const dateTo = new Date(now); dateTo.setDate(dateTo.getDate() + 60)
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const res = await fetch(
    `https://api.football-data.org/v4/competitions/${leagueId}/matches?dateFrom=${fmt(dateFrom)}&dateTo=${fmt(dateTo)}`,
    { headers: { 'X-Auth-Token': apiKey }, next: { revalidate: 0 } }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`football-data.org ${res.status}: ${text}`)
  }

  const data = await res.json()
  const matches: FdMatch[] = data.matches ?? []
  if (!matches.length) return { synced: 0, total: 0, tournament: leagueId }

  const tournamentName = matches[0].competition.name
  const hasLive = matches.some(m => normalizeFdStatus(m.status) === 'live')
  const hasUpcoming = matches.some(m => normalizeFdStatus(m.status) === 'scheduled')
  const hasCompleted = matches.some(m => normalizeFdStatus(m.status) === 'completed')
  const tournamentStatus = hasLive ? 'active' : (hasUpcoming && hasCompleted) ? 'active' : hasUpcoming ? 'upcoming' : 'completed'

  await supabase.from('tournaments').upsert(
    { id: leagueId, name: tournamentName, sport: 'football', status: tournamentStatus },
    { onConflict: 'id' }
  )

  const fixtures = matches.map(m => {
    const status = normalizeFdStatus(m.status)
    return {
      id: fdIdToUuid(m.id),
      tournament_id: leagueId,
      home_team_name: m.homeTeam.shortName || m.homeTeam.name,
      away_team_name: m.awayTeam.shortName || m.awayTeam.name,
      home_team_logo: m.homeTeam.crest || null,
      away_team_logo: m.awayTeam.crest || null,
      kickoff_time: m.utcDate,
      status,
      home_score: status === 'completed' ? (m.score.fullTime.home ?? null) : null,
      away_score: status === 'completed' ? (m.score.fullTime.away ?? null) : null,
      stage: m.matchday ? `Round ${m.matchday}` : 'Group Stage',
      is_underdog_home: false,
      is_underdog_away: false,
    }
  })

  const BATCH = 50
  let synced = 0
  for (let i = 0; i < fixtures.length; i += BATCH) {
    const { error } = await supabase.from('fixtures').upsert(fixtures.slice(i, i + BATCH), { onConflict: 'id' })
    if (!error) synced += Math.min(BATCH, fixtures.length - i)
  }

  return { synced, total: fixtures.length, tournament: tournamentName }
}

// ─── TheSportsDB sync ─────────────────────────────────────────────────────────

async function syncFromSportsdb(leagueId: string, season: string, supabase: ReturnType<typeof makeSupabase>) {
  const seasonRes = await fetch(
    `https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=${leagueId}&s=${encodeURIComponent(season)}`,
    { next: { revalidate: 0 } }
  )

  const seasonData = seasonRes.ok
    ? await seasonRes.json().catch(() => ({ events: [] }))
    : { events: [] }

  let events: SportsdbEvent[] = seasonData.events ?? []

  // Fall back to next+last if season endpoint returns nothing
  if (!events.length) {
    const [nextRes, lastRes] = await Promise.all([
      fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=${leagueId}`, { next: { revalidate: 0 } }),
      fetch(`https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${leagueId}`, { next: { revalidate: 0 } }),
    ])
    const [nextData, lastData] = await Promise.all([
      nextRes.ok ? nextRes.json().catch(() => ({ events: [] })) : { events: [] },
      lastRes.ok ? lastRes.json().catch(() => ({ events: [] })) : { events: [] },
    ]) as [{ events?: SportsdbEvent[] }, { events?: SportsdbEvent[] }]
    const seen = new Set<string>()
    events = [...(lastData.events ?? []), ...(nextData.events ?? [])].filter(e => {
      if (seen.has(e.idEvent)) return false
      seen.add(e.idEvent)
      return true
    })
  }

  if (!events.length) return { synced: 0, total: 0, tournament: leagueId }

  const first = events[0]
  const hasLive = events.some(e => normalizeSportsdbStatus(e.strStatus, e.strPostponed) === 'live')
  const hasFuture = events.some(e => new Date(e.strTimestamp) > new Date())
  const hasPast = events.some(e => normalizeSportsdbStatus(e.strStatus, e.strPostponed) === 'completed')
  const tournamentStatus = hasLive ? 'active' : (hasFuture && hasPast) ? 'active' : hasFuture ? 'upcoming' : 'completed'

  await supabase.from('tournaments').upsert(
    { id: leagueId, name: first.strLeague, sport: normalizeSport(first.strSport), status: tournamentStatus },
    { onConflict: 'id' }
  )

  const fixtures = events.map(e => {
    const status = normalizeSportsdbStatus(e.strStatus, e.strPostponed)
    const homeScore = e.intHomeScore != null && e.intHomeScore !== '' ? parseInt(e.intHomeScore) : null
    const awayScore = e.intAwayScore != null && e.intAwayScore !== '' ? parseInt(e.intAwayScore) : null
    return {
      id: sportsdbIdToUuid(e.idEvent),
      tournament_id: leagueId,
      home_team_name: e.strHomeTeam,
      away_team_name: e.strAwayTeam,
      home_team_logo: e.strHomeTeamBadge || null,
      away_team_logo: e.strAwayTeamBadge || null,
      kickoff_time: e.strTimestamp,
      status,
      home_score: status === 'completed' ? homeScore : null,
      away_score: status === 'completed' ? awayScore : null,
      stage: e.intRound ? `Round ${e.intRound}` : 'Group Stage',
      is_underdog_home: false,
      is_underdog_away: false,
    }
  })

  const BATCH = 50
  let synced = 0
  for (let i = 0; i < fixtures.length; i += BATCH) {
    const { error } = await supabase.from('fixtures').upsert(fixtures.slice(i, i + BATCH), { onConflict: 'id' })
    if (!error) synced += Math.min(BATCH, fixtures.length - i)
  }

  return { synced, total: fixtures.length, tournament: first.strLeague }
}

// ─── BallDontLie NBA sync ─────────────────────────────────────────────────────

function bdlIdToUuid(id: number): string {
  return `00000000-0000-0002-0000-${String(id).padStart(12, '0')}`
}

function normalizeBdlStatus(status: string, period: number): 'scheduled' | 'live' | 'completed' {
  if (status === 'Final' || status === 'Final/OT') return 'completed'
  if (period > 0) return 'live'
  return 'scheduled'
}

async function syncFromBalldontlie(season: string, supabase: ReturnType<typeof makeSupabase>) {
  const apiKey = process.env.BALLDONTLIE_API_KEY
  if (!apiKey) throw new Error('BALLDONTLIE_API_KEY not set')

  // BDL season = start year (e.g. "2025" from "2025-2026")
  const seasonYear = season.split('-')[0]

  const now = new Date()
  const dateFrom = new Date(now); dateFrom.setDate(dateFrom.getDate() - 30)
  const dateTo = new Date(now); dateTo.setDate(dateTo.getDate() + 60)
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  let allGames: BdlGame[] = []
  let cursor: number | null = null

  do {
    const url = new URL('https://api.balldontlie.io/v1/games')
    url.searchParams.set('seasons[]', seasonYear)
    url.searchParams.set('start_date', fmt(dateFrom))
    url.searchParams.set('end_date', fmt(dateTo))
    url.searchParams.set('per_page', '100')
    if (cursor) url.searchParams.set('cursor', String(cursor))

    const res = await fetch(url.toString(), {
      headers: { Authorization: apiKey },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`balldontlie ${res.status}: ${text}`)
    }

    const data = await res.json()
    allGames = allGames.concat(data.data ?? [])
    cursor = data.meta?.next_cursor ?? null
  } while (cursor)

  if (!allGames.length) return { synced: 0, total: 0, tournament: 'NBA' }

  const hasLive = allGames.some(g => normalizeBdlStatus(g.status, g.period) === 'live')
  const hasUpcoming = allGames.some(g => normalizeBdlStatus(g.status, g.period) === 'scheduled')
  const hasCompleted = allGames.some(g => normalizeBdlStatus(g.status, g.period) === 'completed')
  const tournamentStatus = hasLive ? 'active' : (hasUpcoming && hasCompleted) ? 'active' : hasUpcoming ? 'upcoming' : 'completed'

  await supabase.from('tournaments').upsert(
    { id: 'nba', name: 'NBA', sport: 'basketball', status: tournamentStatus },
    { onConflict: 'id' }
  )

  const fixtures = allGames.map(g => {
    const status = normalizeBdlStatus(g.status, g.period)
    return {
      id: bdlIdToUuid(g.id),
      tournament_id: 'nba',
      home_team_name: g.home_team.full_name,
      away_team_name: g.visitor_team.full_name,
      home_team_logo: null,
      away_team_logo: null,
      kickoff_time: g.date,
      status,
      home_score: status === 'completed' ? g.home_team_score : null,
      away_score: status === 'completed' ? g.visitor_team_score : null,
      stage: g.postseason ? 'Playoffs' : 'Regular Season',
      is_underdog_home: false,
      is_underdog_away: false,
    }
  })

  const BATCH = 50
  let synced = 0
  for (let i = 0; i < fixtures.length; i += BATCH) {
    const { error } = await supabase.from('fixtures').upsert(fixtures.slice(i, i + BATCH), { onConflict: 'id' })
    if (!error) synced += Math.min(BATCH, fixtures.length - i)
  }

  return { synced, total: fixtures.length, tournament: 'NBA' }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const querySecret = request.nextUrl.searchParams.get('secret')
  const cronSecret = process.env.CRON_SECRET
  const syncSecret = process.env.SYNC_SECRET

  const authorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (syncSecret && querySecret === syncSecret)

  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = request.nextUrl.searchParams.get('league_id')
  const season = request.nextUrl.searchParams.get('season') ?? ''

  if (!leagueId) return NextResponse.json({ error: 'Missing league_id' }, { status: 400 })

  const supabase = makeSupabase()

  try {
    let result
    if (leagueId === 'nba') {
      result = await syncFromBalldontlie(season, supabase)
    } else if (/^\d+$/.test(leagueId)) {
      result = await syncFromSportsdb(leagueId, season, supabase)
    } else {
      result = await syncFromFootballData(leagueId, supabase)
    }

    return NextResponse.json({ ok: true, ...result, season })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }
}
