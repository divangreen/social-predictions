export interface TimelineEvent {
  minute: number
  type: 'goal' | 'own_goal' | 'penalty' | 'yellow' | 'red' | 'yellow_red' | 'sub'
  team: 'home' | 'away'
  player: string
  detail?: string // assist, player off, etc.
}

export interface PlayerEntry {
  name: string
  number: number | null
  position: string | null
}

export interface MatchDetails {
  // Info
  venue: string | null
  referee: string | null
  attendance: number | null
  date: string | null
  // Score detail
  halfTimeHome: number | null
  halfTimeAway: number | null
  // Formations & lineups
  homeFormation: string | null
  awayFormation: string | null
  homeStarting: PlayerEntry[]
  awayStarting: PlayerEntry[]
  homeSubs: PlayerEntry[]
  awaySubs: PlayerEntry[]
  // Timeline
  timeline: TimelineEvent[]
  // Stats
  stats: { label: string; home: number | string; away: number | string }[]
}

type Source = 'fd' | 'sportsdb' | 'bdl' | 'unknown'

export function decodeFixtureId(uuid: string): { source: Source; externalId: number } {
  const parts = uuid.split('-')
  const variant = parts[2]
  const externalId = parseInt(parts[4], 10)
  if (variant === '0000') return { source: 'sportsdb', externalId }
  if (variant === '0001') return { source: 'fd', externalId }
  if (variant === '0002') return { source: 'bdl', externalId }
  return { source: 'unknown', externalId }
}

// ─── football-data.org ────────────────────────────────────────────────────────

async function fetchFdDetails(matchId: number): Promise<MatchDetails> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) return empty()

  const res = await fetch(`https://api.football-data.org/v4/matches/${matchId}`, {
    headers: { 'X-Auth-Token': apiKey },
    next: { revalidate: 60 },
  })
  if (!res.ok) return empty()

  const d = await res.json()
  const homeId = d.homeTeam?.id

  const timeline: TimelineEvent[] = []

  for (const g of d.goals ?? []) {
    const team = g.team?.id === homeId ? 'home' : 'away'
    const type =
      g.type === 'OWN_GOAL' ? 'own_goal' :
      g.type === 'PENALTY' ? 'penalty' : 'goal'
    timeline.push({
      minute: g.minute ?? 0,
      type,
      team,
      player: g.scorer?.name ?? '',
      detail: g.assist?.name ?? undefined,
    })
  }

  for (const b of d.bookings ?? []) {
    const team = b.team?.id === homeId ? 'home' : 'away'
    const type =
      b.card === 'RED_CARD' ? 'red' :
      b.card === 'YELLOW_RED_CARD' ? 'yellow_red' : 'yellow'
    timeline.push({ minute: b.minute ?? 0, type, team, player: b.player?.name ?? '' })
  }

  for (const s of d.substitutions ?? []) {
    const team = s.team?.id === homeId ? 'home' : 'away'
    timeline.push({
      minute: s.minute ?? 0,
      type: 'sub',
      team,
      player: s.playerIn?.name ?? '',
      detail: s.playerOut?.name,
    })
  }

  timeline.sort((a, b) => a.minute - b.minute)

  const stats: { label: string; home: number | string; away: number | string }[] = []
  for (const s of d.statistics ?? []) {
    if (s.homeTeam != null && s.awayTeam != null) {
      stats.push({ label: formatLabel(s.type), home: s.homeTeam, away: s.awayTeam })
    }
  }

  return {
    venue: d.venue ?? null,
    referee: d.referees?.[0]
      ? `${d.referees[0].name}${d.referees[0].nationality ? ` (${d.referees[0].nationality})` : ''}`
      : null,
    attendance: d.attendance ?? null,
    date: d.utcDate ?? null,
    halfTimeHome: d.score?.halfTime?.home ?? null,
    halfTimeAway: d.score?.halfTime?.away ?? null,
    homeFormation: d.homeTeam?.formation ?? null,
    awayFormation: d.awayTeam?.formation ?? null,
    homeStarting: mapFdLineup(d.homeTeam?.lineup ?? []),
    awayStarting: mapFdLineup(d.awayTeam?.lineup ?? []),
    homeSubs: mapFdLineup(d.homeTeam?.bench ?? []),
    awaySubs: mapFdLineup(d.awayTeam?.bench ?? []),
    timeline,
    stats,
  }
}

function mapFdLineup(players: { name: string; shirtNumber?: number; position?: string }[]): PlayerEntry[] {
  return players.map(p => ({ name: p.name, number: p.shirtNumber ?? null, position: p.position ?? null }))
}

// ─── TheSportsDB ──────────────────────────────────────────────────────────────

async function fetchSportsdbDetails(eventId: number): Promise<MatchDetails> {
  const [evRes, lineupRes] = await Promise.all([
    fetch(`https://www.thesportsdb.com/api/v1/json/3/lookupevent.php?id=${eventId}`, { next: { revalidate: 60 } }),
    fetch(`https://www.thesportsdb.com/api/v1/json/3/eventlineup.php?id=${eventId}`, { next: { revalidate: 60 } }),
  ])

  const ev = evRes.ok ? (await evRes.json()).events?.[0] : null
  const lineupData = lineupRes.ok ? await lineupRes.json() : null

  const timeline: TimelineEvent[] = []

  if (ev) {
    // Parse goal strings like "Mbappe 12', Giroud 45'+2"
    const parseGoals = (str: string | null, team: 'home' | 'away') => {
      if (!str) return
      for (const part of str.split(';')) {
        const t = part.trim()
        if (!t) continue
        const match = t.match(/^(.+?)\s+(\d+)/)
        timeline.push({ minute: match ? parseInt(match[2]) : 0, type: 'goal', team, player: match ? match[1] : t })
      }
    }
    parseGoals(ev.strHomeGoalDetails, 'home')
    parseGoals(ev.strAwayGoalDetails, 'away')
    timeline.sort((a, b) => a.minute - b.minute)
  }

  const homeStarting: PlayerEntry[] = []
  const awayStarting: PlayerEntry[] = []
  for (const p of lineupData?.lineup ?? []) {
    const entry: PlayerEntry = { name: p.strPlayer, number: p.intSquadNumber ? parseInt(p.intSquadNumber) : null, position: p.strPosition ?? null }
    if (p.strTeam === ev?.strHomeTeam) homeStarting.push(entry)
    else awayStarting.push(entry)
  }

  const statsRaw: { label: string; home: number | string; away: number | string }[] = []
  if (ev) {
    const pairs: [string, string | null, string | null][] = [
      ['Shots', ev.intHomeShots, ev.intAwayShots],
      ['Shots on Target', ev.intHomeShotsOnTarget, ev.intAwayShotsOnTarget],
      ['Possession %', ev.intHomePossession ? ev.intHomePossession + '%' : null, ev.intAwayPossession ? ev.intAwayPossession + '%' : null],
    ]
    for (const [label, h, a] of pairs) {
      if (h != null && a != null) statsRaw.push({ label, home: h, away: a })
    }
  }

  return {
    venue: ev?.strVenue ?? null,
    referee: ev?.strReferee ?? null,
    attendance: ev?.intAttendance ? parseInt(ev.intAttendance) : null,
    date: ev?.strTimestamp ?? null,
    halfTimeHome: null,
    halfTimeAway: null,
    homeFormation: null,
    awayFormation: null,
    homeStarting,
    awayStarting,
    homeSubs: [],
    awaySubs: [],
    timeline,
    stats: statsRaw,
  }
}

// ─── balldontlie (NBA) ────────────────────────────────────────────────────────

interface BdlBoxPlayer {
  player: { first_name: string; last_name: string }
  team: { abbreviation: string }
  pts: number; reb: number; ast: number; stl: number; blk: number
  fg_pct: number; fg3_pct: number; ft_pct: number
  min: string
}

async function fetchBdlDetails(gameId: number): Promise<MatchDetails> {
  const apiKey = process.env.BALLDONTLIE_API_KEY
  if (!apiKey) return empty()

  const [gameRes, boxRes] = await Promise.all([
    fetch(`https://api.balldontlie.io/v1/games/${gameId}`, { headers: { Authorization: apiKey }, next: { revalidate: 60 } }),
    fetch(`https://api.balldontlie.io/v1/stats?game_ids[]=${gameId}&per_page=100`, { headers: { Authorization: apiKey }, next: { revalidate: 60 } }),
  ])

  const game = gameRes.ok ? (await gameRes.json()) : null
  const boxData = boxRes.ok ? (await boxRes.json()) : null
  const players: BdlBoxPlayer[] = boxData?.data ?? []

  const homeAbbr = game?.home_team?.abbreviation
  const homePlayers = players.filter(p => p.team.abbreviation === homeAbbr && p.min && p.min !== '00')
  const awayPlayers = players.filter(p => p.team.abbreviation !== homeAbbr && p.min && p.min !== '00')

  const toEntry = (p: BdlBoxPlayer): PlayerEntry => ({
    name: `${p.player.first_name} ${p.player.last_name}`,
    number: null,
    position: `${p.pts}pts ${p.reb}reb ${p.ast}ast`,
  })

  return {
    venue: game?.arena ?? null,
    referee: null,
    attendance: null,
    date: game?.date ?? null,
    halfTimeHome: null,
    halfTimeAway: null,
    homeFormation: null,
    awayFormation: null,
    homeStarting: homePlayers.sort((a, b) => b.pts - a.pts).slice(0, 5).map(toEntry),
    awayStarting: awayPlayers.sort((a, b) => b.pts - a.pts).slice(0, 5).map(toEntry),
    homeSubs: homePlayers.sort((a, b) => b.pts - a.pts).slice(5).map(toEntry),
    awaySubs: awayPlayers.sort((a, b) => b.pts - a.pts).slice(5).map(toEntry),
    timeline: [],
    stats: [],
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLabel(type: string): string {
  return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function empty(): MatchDetails {
  return {
    venue: null, referee: null, attendance: null, date: null,
    halfTimeHome: null, halfTimeAway: null,
    homeFormation: null, awayFormation: null,
    homeStarting: [], awayStarting: [], homeSubs: [], awaySubs: [],
    timeline: [], stats: [],
  }
}

export async function fetchMatchDetails(fixtureUuid: string): Promise<MatchDetails> {
  const { source, externalId } = decodeFixtureId(fixtureUuid)
  if (isNaN(externalId)) return empty()
  if (source === 'fd') return fetchFdDetails(externalId)
  if (source === 'sportsdb') return fetchSportsdbDetails(externalId)
  if (source === 'bdl') return fetchBdlDetails(externalId)
  return empty()
}
