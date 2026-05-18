export interface MatchDetails {
  venue: string | null
  referee: string | null
  attendance: number | null
  homeFormation: string | null
  awayFormation: string | null
  homeGoalscorers: { name: string; minute: number }[]
  awayGoalscorers: { name: string; minute: number }[]
  stats: { label: string; home: string | number; away: string | number }[]
}

type Source = 'fd' | 'sportsdb' | 'bdl' | 'unknown'

function decodeFixtureId(uuid: string): { source: Source; externalId: number } {
  // 00000000-0000-0000-0000-XXXX → TheSportsDB
  // 00000000-0000-0001-0000-XXXX → football-data.org
  // 00000000-0000-0002-0000-XXXX → balldontlie
  const parts = uuid.split('-')
  const variant = parts[2]
  const externalId = parseInt(parts[4], 10)
  if (variant === '0000') return { source: 'sportsdb', externalId }
  if (variant === '0001') return { source: 'fd', externalId }
  if (variant === '0002') return { source: 'bdl', externalId }
  return { source: 'unknown', externalId }
}

async function fetchFdDetails(matchId: number): Promise<MatchDetails> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) return empty()

  const res = await fetch(`https://api.football-data.org/v4/matches/${matchId}`, {
    headers: { 'X-Auth-Token': apiKey },
    next: { revalidate: 60 },
  })
  if (!res.ok) return empty()

  const d = await res.json()

  const homeGoals: { name: string; minute: number }[] = []
  const awayGoals: { name: string; minute: number }[] = []
  for (const g of d.goals ?? []) {
    const entry = { name: g.scorer?.name ?? '', minute: g.minute ?? 0 }
    if (g.team?.id === d.homeTeam?.id) homeGoals.push(entry)
    else awayGoals.push(entry)
  }

  const stats: { label: string; home: string | number; away: string | number }[] = []
  for (const s of d.statistics ?? []) {
    stats.push({ label: formatStatLabel(s.type), home: s.homeTeam ?? 0, away: s.awayTeam ?? 0 })
  }

  return {
    venue: d.venue ?? null,
    referee: d.referees?.[0]
      ? `${d.referees[0].name}${d.referees[0].nationality ? ` (${d.referees[0].nationality})` : ''}`
      : null,
    attendance: d.attendance ?? null,
    homeFormation: d.homeTeam?.formation ?? null,
    awayFormation: d.awayTeam?.formation ?? null,
    homeGoalscorers: homeGoals,
    awayGoalscorers: awayGoals,
    stats,
  }
}

async function fetchSportsdbDetails(eventId: number): Promise<MatchDetails> {
  const res = await fetch(
    `https://www.thesportsdb.com/api/v1/json/3/lookupevent.php?id=${eventId}`,
    { next: { revalidate: 60 } }
  )
  if (!res.ok) return empty()

  const d = await res.json()
  const ev = d.events?.[0]
  if (!ev) return empty()

  return {
    venue: ev.strVenue ?? null,
    referee: ev.strReferee ?? null,
    attendance: ev.intAttendance ? parseInt(ev.intAttendance) : null,
    homeFormation: null,
    awayFormation: null,
    homeGoalscorers: [],
    awayGoalscorers: [],
    stats: [],
  }
}

async function fetchBdlDetails(gameId: number): Promise<MatchDetails> {
  const apiKey = process.env.BALLDONTLIE_API_KEY
  if (!apiKey) return empty()

  const res = await fetch(`https://api.balldontlie.io/v1/games/${gameId}`, {
    headers: { Authorization: apiKey },
    next: { revalidate: 60 },
  })
  if (!res.ok) return empty()

  const d = await res.json()
  return {
    venue: d.arena ?? null,
    referee: null,
    attendance: null,
    homeFormation: null,
    awayFormation: null,
    homeGoalscorers: [],
    awayGoalscorers: [],
    stats: [],
  }
}

function formatStatLabel(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

function empty(): MatchDetails {
  return { venue: null, referee: null, attendance: null, homeFormation: null, awayFormation: null, homeGoalscorers: [], awayGoalscorers: [], stats: [] }
}

export async function fetchMatchDetails(fixtureUuid: string): Promise<MatchDetails> {
  const { source, externalId } = decodeFixtureId(fixtureUuid)
  if (isNaN(externalId)) return empty()

  if (source === 'fd') return fetchFdDetails(externalId)
  if (source === 'sportsdb') return fetchSportsdbDetails(externalId)
  if (source === 'bdl') return fetchBdlDetails(externalId)
  return empty()
}
