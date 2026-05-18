export interface TimelineEvent {
  minute: number
  type: 'goal' | 'own_goal' | 'penalty' | 'yellow' | 'red' | 'yellow_red' | 'sub'
  team: 'home' | 'away'
  player: string
  detail?: string
}

export interface PlayerEntry {
  name: string
  number: number | null
  position: string | null
}

export interface NbaPlayerStat {
  name: string
  number: number | null
  position: string | null
  min: string
  pts: number
  fgm: number; fga: number
  fg3m: number; fg3a: number
  ftm: number; fta: number
  reb: number; oreb: number; dreb: number
  ast: number
  stl: number
  blk: number
  to: number
  pf: number
  plusMinus: number | null
  dnp: boolean
}

export interface NbaTeamStat {
  label: string
  home: string
  away: string
}

export interface MatchDetails {
  sport: 'football' | 'basketball' | 'other'
  venue: string | null
  referee: string | null
  attendance: number | null
  date: string | null
  halfTimeHome: number | null
  halfTimeAway: number | null
  homeFormation: string | null
  awayFormation: string | null
  homeStarting: PlayerEntry[]
  awayStarting: PlayerEntry[]
  homeSubs: PlayerEntry[]
  awaySubs: PlayerEntry[]
  timeline: TimelineEvent[]
  stats: { label: string; home: number | string; away: number | string }[]
  // NBA specific
  nbaHomePlayers: NbaPlayerStat[]
  nbaAwayPlayers: NbaPlayerStat[]
  nbaTeamStats: NbaTeamStat[]
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
  if (!apiKey) return empty('football')

  const res = await fetch(`https://api.football-data.org/v4/matches/${matchId}`, {
    headers: { 'X-Auth-Token': apiKey },
    next: { revalidate: 60 },
  })
  if (!res.ok) return empty('football')

  const d = await res.json()
  const homeId = d.homeTeam?.id
  const timeline: TimelineEvent[] = []

  for (const g of d.goals ?? []) {
    const team = g.team?.id === homeId ? 'home' : 'away'
    const type = g.type === 'OWN_GOAL' ? 'own_goal' : g.type === 'PENALTY' ? 'penalty' : 'goal'
    timeline.push({ minute: g.minute ?? 0, type, team, player: g.scorer?.name ?? '', detail: g.assist?.name })
  }
  for (const b of d.bookings ?? []) {
    const team = b.team?.id === homeId ? 'home' : 'away'
    const type = b.card === 'RED_CARD' ? 'red' : b.card === 'YELLOW_RED_CARD' ? 'yellow_red' : 'yellow'
    timeline.push({ minute: b.minute ?? 0, type, team, player: b.player?.name ?? '' })
  }
  for (const s of d.substitutions ?? []) {
    const team = s.team?.id === homeId ? 'home' : 'away'
    timeline.push({ minute: s.minute ?? 0, type: 'sub', team, player: s.playerIn?.name ?? '', detail: s.playerOut?.name })
  }
  timeline.sort((a, b) => a.minute - b.minute)

  const stats = (d.statistics ?? [])
    .filter((s: { homeTeam: unknown; awayTeam: unknown }) => s.homeTeam != null && s.awayTeam != null)
    .map((s: { type: string; homeTeam: number | string; awayTeam: number | string }) => ({
      label: formatLabel(s.type), home: s.homeTeam, away: s.awayTeam,
    }))

  return {
    sport: 'football',
    venue: d.venue ?? null,
    referee: d.referees?.[0] ? `${d.referees[0].name}${d.referees[0].nationality ? ` (${d.referees[0].nationality})` : ''}` : null,
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
    nbaHomePlayers: [], nbaAwayPlayers: [], nbaTeamStats: [],
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

  const stats: { label: string; home: number | string; away: number | string }[] = []
  if (ev) {
    const pairs: [string, string | null, string | null][] = [
      ['Shots', ev.intHomeShots, ev.intAwayShots],
      ['Shots on Target', ev.intHomeShotsOnTarget, ev.intAwayShotsOnTarget],
      ['Possession %', ev.intHomePossession ? ev.intHomePossession + '%' : null, ev.intAwayPossession ? ev.intAwayPossession + '%' : null],
    ]
    for (const [label, h, a] of pairs) {
      if (h != null && a != null) stats.push({ label, home: h, away: a })
    }
  }

  return {
    sport: 'football',
    venue: ev?.strVenue ?? null,
    referee: ev?.strReferee ?? null,
    attendance: ev?.intAttendance ? parseInt(ev.intAttendance) : null,
    date: ev?.strTimestamp ?? null,
    halfTimeHome: null, halfTimeAway: null,
    homeFormation: null, awayFormation: null,
    homeStarting, awayStarting, homeSubs: [], awaySubs: [],
    timeline, stats,
    nbaHomePlayers: [], nbaAwayPlayers: [], nbaTeamStats: [],
  }
}

// ─── balldontlie (NBA) ────────────────────────────────────────────────────────

interface RawBdlStat {
  player: { id: number; first_name: string; last_name: string }
  team: { id: number; abbreviation: string; full_name: string }
  min: string
  pts: number; fgm: number; fga: number; fg_pct: number
  fg3m: number; fg3a: number; fg3_pct: number
  ftm: number; fta: number; ft_pct: number
  oreb: number; dreb: number; reb: number
  ast: number; stl: number; blk: number
  turnover: number; pf: number
}

async function fetchBdlDetails(gameId: number): Promise<MatchDetails> {
  const apiKey = process.env.BALLDONTLIE_API_KEY
  if (!apiKey) return empty('basketball')

  const [gameRes, statsRes] = await Promise.all([
    fetch(`https://api.balldontlie.io/v1/games/${gameId}`, { headers: { Authorization: apiKey }, next: { revalidate: 60 } }),
    fetch(`https://api.balldontlie.io/v1/stats?game_ids[]=${gameId}&per_page=100`, { headers: { Authorization: apiKey }, next: { revalidate: 60 } }),
  ])

  if (!gameRes.ok) return empty('basketball')
  const game = await gameRes.json()
  const statsData = statsRes.ok ? await statsRes.json() : { data: [] }
  const rawStats: RawBdlStat[] = statsData.data ?? []

  const homeId = game.home_team?.id
  const homeAbbr = game.home_team?.abbreviation ?? ''
  const awayAbbr = game.visitor_team?.abbreviation ?? ''

  const toNbaStat = (r: RawBdlStat): NbaPlayerStat => {
    const dnp = !r.min || r.min === '00' || r.min === '0:00'
    return {
      name: `${r.player.first_name} ${r.player.last_name}`,
      number: null,
      position: null,
      min: r.min ?? '0',
      pts: r.pts ?? 0,
      fgm: r.fgm ?? 0, fga: r.fga ?? 0,
      fg3m: r.fg3m ?? 0, fg3a: r.fg3a ?? 0,
      ftm: r.ftm ?? 0, fta: r.fta ?? 0,
      reb: r.reb ?? 0, oreb: r.oreb ?? 0, dreb: r.dreb ?? 0,
      ast: r.ast ?? 0,
      stl: r.stl ?? 0,
      blk: r.blk ?? 0,
      to: r.turnover ?? 0,
      pf: r.pf ?? 0,
      plusMinus: null,
      dnp,
    }
  }

  const homePlayers = rawStats
    .filter(r => r.team.id === homeId)
    .map(toNbaStat)
    .sort((a, b) => b.pts - a.pts)

  const awayPlayers = rawStats
    .filter(r => r.team.id !== homeId)
    .map(toNbaStat)
    .sort((a, b) => b.pts - a.pts)

  // Aggregate team stats
  const agg = (players: NbaPlayerStat[]) => {
    const active = players.filter(p => !p.dnp)
    return {
      pts: active.reduce((s, p) => s + p.pts, 0),
      fgm: active.reduce((s, p) => s + p.fgm, 0),
      fga: active.reduce((s, p) => s + p.fga, 0),
      fg3m: active.reduce((s, p) => s + p.fg3m, 0),
      fg3a: active.reduce((s, p) => s + p.fg3a, 0),
      ftm: active.reduce((s, p) => s + p.ftm, 0),
      fta: active.reduce((s, p) => s + p.fta, 0),
      reb: active.reduce((s, p) => s + p.reb, 0),
      oreb: active.reduce((s, p) => s + p.oreb, 0),
      dreb: active.reduce((s, p) => s + p.dreb, 0),
      ast: active.reduce((s, p) => s + p.ast, 0),
      stl: active.reduce((s, p) => s + p.stl, 0),
      blk: active.reduce((s, p) => s + p.blk, 0),
      to: active.reduce((s, p) => s + p.to, 0),
      pf: active.reduce((s, p) => s + p.pf, 0),
    }
  }

  const h = agg(homePlayers)
  const a = agg(awayPlayers)
  const fgPct = (m: number, att: number) => att > 0 ? ((m / att) * 100).toFixed(1) : '0.0'

  const nbaTeamStats: NbaTeamStat[] = [
    { label: 'Field Goals', home: `${h.fgm}/${h.fga}`, away: `${a.fgm}/${a.fga}` },
    { label: 'Field Goal %', home: fgPct(h.fgm, h.fga), away: fgPct(a.fgm, a.fga) },
    { label: 'Three-pointers', home: `${h.fg3m}/${h.fg3a}`, away: `${a.fg3m}/${a.fg3a}` },
    { label: 'Three-point %', home: fgPct(h.fg3m, h.fg3a), away: fgPct(a.fg3m, a.fg3a) },
    { label: 'Free Throws', home: `${h.ftm}/${h.fta}`, away: `${a.ftm}/${a.fta}` },
    { label: 'Free Throw %', home: fgPct(h.ftm, h.fta), away: fgPct(a.ftm, a.fta) },
    { label: 'Total Rebounds', home: String(h.reb), away: String(a.reb) },
    { label: 'Offensive Rebounds', home: String(h.oreb), away: String(a.oreb) },
    { label: 'Defensive Rebounds', home: String(h.dreb), away: String(a.dreb) },
    { label: 'Assists', home: String(h.ast), away: String(a.ast) },
    { label: 'Blocks', home: String(h.blk), away: String(a.blk) },
    { label: 'Steals', home: String(h.stl), away: String(a.stl) },
    { label: 'Turnovers', home: String(h.to), away: String(a.to) },
    { label: 'Personal Fouls', home: String(h.pf), away: String(a.pf) },
  ]

  return {
    sport: 'basketball',
    venue: game.arena ?? null,
    referee: null,
    attendance: null,
    date: game.date ?? null,
    halfTimeHome: null, halfTimeAway: null,
    homeFormation: null, awayFormation: null,
    homeStarting: homePlayers.filter(p => !p.dnp).slice(0, 5).map(p => ({ name: p.name, number: null, position: `${p.pts}pts ${p.reb}reb ${p.ast}ast` })),
    awayStarting: awayPlayers.filter(p => !p.dnp).slice(0, 5).map(p => ({ name: p.name, number: null, position: `${p.pts}pts ${p.reb}reb ${p.ast}ast` })),
    homeSubs: [], awaySubs: [],
    timeline: [],
    stats: [],
    nbaHomePlayers: homePlayers,
    nbaAwayPlayers: awayPlayers,
    nbaTeamStats,
    // Store abbreviations for tab labels
    ...({ _homeAbbr: homeAbbr, _awayAbbr: awayAbbr } as object),
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLabel(type: string): string {
  return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function empty(sport: 'football' | 'basketball' | 'other' = 'other'): MatchDetails {
  return {
    sport, venue: null, referee: null, attendance: null, date: null,
    halfTimeHome: null, halfTimeAway: null,
    homeFormation: null, awayFormation: null,
    homeStarting: [], awayStarting: [], homeSubs: [], awaySubs: [],
    timeline: [], stats: [],
    nbaHomePlayers: [], nbaAwayPlayers: [], nbaTeamStats: [],
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
