import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { WC2026_GROUPS, WC_TOURNAMENT_ID } from '@/lib/wc2026-groups'

export const revalidate = 60

type TeamStats = {
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  pts: number
}

function buildTable(teams: string[], fixtures: { home: string; away: string; homeScore: number; awayScore: number }[]): TeamStats[] {
  const stats = new Map<string, TeamStats>(
    teams.map(t => [t, { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 }])
  )

  for (const f of fixtures) {
    const home = stats.get(f.home)
    const away = stats.get(f.away)
    if (!home || !away) continue

    home.played++; away.played++
    home.gf += f.homeScore; home.ga += f.awayScore
    away.gf += f.awayScore; away.ga += f.homeScore

    if (f.homeScore > f.awayScore) {
      home.won++; home.pts += 3; away.lost++
    } else if (f.homeScore < f.awayScore) {
      away.won++; away.pts += 3; home.lost++
    } else {
      home.drawn++; home.pts += 1
      away.drawn++; away.pts += 1
    }

    home.gd = home.gf - home.ga
    away.gd = away.gf - away.ga
  }

  return Array.from(stats.values()).sort((a, b) =>
    b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team)
  )
}

export default async function WCStandingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('home_team_name, away_team_name, home_score, away_score, status, stage')
    .eq('tournament_id', WC_TOURNAMENT_ID)
    .eq('status', 'completed')

  // Build a team → group map for fast lookup
  const teamGroup = new Map<string, string>()
  for (const g of WC2026_GROUPS) {
    for (const t of g.teams) teamGroup.set(t, g.letter)
  }

  // Filter to fixtures where both teams are in the same group (i.e. group-stage games)
  type GroupFixture = { home: string; away: string; homeScore: number; awayScore: number }
  const byGroup = new Map<string, GroupFixture[]>()

  for (const f of fixtures ?? []) {
    if (f.home_score === null || f.away_score === null) continue
    const homeGroup = teamGroup.get(f.home_team_name)
    const awayGroup = teamGroup.get(f.away_team_name)
    if (!homeGroup || homeGroup !== awayGroup) continue

    if (!byGroup.has(homeGroup)) byGroup.set(homeGroup, [])
    byGroup.get(homeGroup)!.push({
      home: f.home_team_name,
      away: f.away_team_name,
      homeScore: f.home_score,
      awayScore: f.away_score,
    })
  }

  const hasAnyResults = byGroup.size > 0

  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="mx-auto max-w-lg">

        <div className="mb-6 flex items-center justify-between">
          <Link href="/world-cup" className="text-sm text-zinc-500 hover:text-zinc-300 transition">
            ← WC Hub
          </Link>
          <Link href="/world-cup/bracket" className="text-sm font-bold text-zinc-400 hover:text-white transition">
            My picks →
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Group Standings</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {hasAnyResults ? 'Updated every minute' : 'Standings appear once matches begin · June 11'}
          </p>
        </div>

        {!hasAnyResults ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">
            <p className="mb-2 text-3xl">⏳</p>
            <p className="font-bold text-zinc-300">No results yet</p>
            <p className="mt-1 text-sm text-zinc-500">Group stage kicks off June 11, 2026</p>
          </div>
        ) : (
          <div className="space-y-6">
            {WC2026_GROUPS.map(group => {
              const groupFixtures = byGroup.get(group.letter) ?? []
              const table = buildTable([...group.teams], groupFixtures)
              const hasGames = groupFixtures.length > 0

              return (
                <div key={group.letter} className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800">
                    <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Group {group.letter}</p>
                  </div>

                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-3 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                    <span>Team</span>
                    <span className="w-5 text-center">P</span>
                    <span className="w-5 text-center">W</span>
                    <span className="w-5 text-center">D</span>
                    <span className="w-5 text-center">L</span>
                    <span className="w-7 text-center font-black text-zinc-500">Pts</span>
                  </div>

                  {/* Table rows */}
                  {table.map((row, i) => (
                    <div
                      key={row.team}
                      className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-3 px-4 py-2.5 text-sm ${
                        i < 2 ? 'bg-white/[0.03]' : ''
                      } ${i === 1 ? 'border-b border-zinc-800/60' : ''}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {hasGames && i < 2 && (
                          <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-green-500" />
                        )}
                        {hasGames && i >= 2 && (
                          <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-zinc-700" />
                        )}
                        <span className="truncate font-bold text-white">{row.team}</span>
                      </div>
                      <span className="w-5 text-center font-mono text-zinc-400">{row.played}</span>
                      <span className="w-5 text-center font-mono text-zinc-400">{row.won}</span>
                      <span className="w-5 text-center font-mono text-zinc-400">{row.drawn}</span>
                      <span className="w-5 text-center font-mono text-zinc-400">{row.lost}</span>
                      <span className={`w-7 text-center font-mono font-black ${row.pts > 0 ? 'text-white' : 'text-zinc-600'}`}>
                        {row.pts}
                      </span>
                    </div>
                  ))}

                  {!hasGames && (
                    <div className="px-4 py-3 text-xs text-zinc-600">No results yet</div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </div>
    </main>
  )
}
