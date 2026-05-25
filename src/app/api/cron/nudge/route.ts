import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import type { Database } from '@/types/database'

function makeSupabase() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })
  }

  const resend = new Resend(resendKey)
  const supabase = makeSupabase()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://social-predictions.vercel.app'

  // Find fixtures kicking off in the next 24 hours
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const { data: upcomingFixtures } = await supabase
    .from('fixtures')
    .select('id, tournament_id, home_team_name, away_team_name, kickoff_time')
    .eq('status', 'scheduled')
    .gte('kickoff_time', now.toISOString())
    .lte('kickoff_time', in24h.toISOString())

  if (!upcomingFixtures?.length) {
    return NextResponse.json({ ok: true, nudged: 0, reason: 'no upcoming fixtures' })
  }

  const tournamentIds = [...new Set(upcomingFixtures.map(f => f.tournament_id))]
  const fixtureIds = upcomingFixtures.map(f => f.id)

  // Find league members for these tournaments
  const { data: leagues } = await supabase
    .from('leagues')
    .select('id, name, tournament_id, invite_code')
    .in('tournament_id', tournamentIds)

  if (!leagues?.length) {
    return NextResponse.json({ ok: true, nudged: 0, reason: 'no leagues for these fixtures' })
  }

  const leagueIds = leagues.map(l => l.id)
  const { data: leagueMembers } = await supabase
    .from('league_members')
    .select('league_id, user_id')
    .in('league_id', leagueIds)

  if (!leagueMembers?.length) {
    return NextResponse.json({ ok: true, nudged: 0, reason: 'no league members' })
  }

  // Get all member user IDs
  const allMemberIds = [...new Set(leagueMembers.map(m => m.user_id))]

  // Find who already has predictions for these fixtures
  const { data: existingPredictions } = await supabase
    .from('predictions')
    .select('user_id, fixture_id')
    .in('user_id', allMemberIds)
    .in('fixture_id', fixtureIds)

  const predictedPairs = new Set(
    (existingPredictions ?? []).map(p => `${p.user_id}:${p.fixture_id}`)
  )

  // Collect which fixtures each user still needs to predict
  const leagueMap = new Map(leagues.map(l => [l.id, l]))
  const userFixturesMap = new Map<string, { leagueId: string; leagueName: string; fixtures: typeof upcomingFixtures }>()

  leagueMembers.forEach(({ league_id, user_id }) => {
    const league = leagueMap.get(league_id)
    if (!league) return

    const missing = upcomingFixtures.filter(f => {
      if (f.tournament_id !== league.tournament_id) return false
      return !predictedPairs.has(`${user_id}:${f.id}`)
    })

    if (!missing.length) return

    // One league per user (keep the one with most missing fixtures)
    const existing = userFixturesMap.get(user_id)
    if (!existing || missing.length > existing.fixtures.length) {
      userFixturesMap.set(user_id, { leagueId: league_id, leagueName: league.name, fixtures: missing })
    }
  })

  if (!userFixturesMap.size) {
    return NextResponse.json({ ok: true, nudged: 0, reason: 'all members have predictions' })
  }

  // Fetch auth emails for users who need nudging — paginate to handle > 1000 users
  const userIds = [...userFixturesMap.keys()]
  const allAuthUsers: { id: string; email?: string }[] = []
  let page = 1
  while (true) {
    const { data: authPage } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    const users = authPage?.users ?? []
    allAuthUsers.push(...users)
    if (users.length < 1000) break
    page++
  }
  const emailMap = new Map(
    allAuthUsers
      .filter(u => userIds.includes(u.id) && u.email)
      .map(u => [u.id, u.email!])
  )

  const { data: profileRows } = await supabase
    .from('users')
    .select('id, username')
    .in('id', userIds)
  const usernameMap = new Map((profileRows ?? []).map(u => [u.id, u.username]))

  let nudged = 0
  const errors: string[] = []

  for (const [userId, { leagueName, fixtures }] of userFixturesMap) {
    const email = emailMap.get(userId)
    if (!email) continue

    const username = usernameMap.get(userId) ?? 'predictor'
    const fixtureList = fixtures
      .slice(0, 3)
      .map(f => {
        const ko = new Date(f.kickoff_time)
        const time = ko.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
        return `• ${f.home_team_name} vs ${f.away_team_name} (${time} UTC)`
      })
      .join('\n')

    const moreCount = fixtures.length > 3 ? ` and ${fixtures.length - 3} more` : ''
    const tournamentId = leagues.find(l => l.name === leagueName)?.tournament_id ?? ''

    const { error } = await resend.emails.send({
      from: 'predictr <noreply@predictr.app>',
      to: email,
      subject: `⏰ Don't miss your picks — ${fixtures.length} fixture${fixtures.length > 1 ? 's' : ''} kick off soon`,
      text: [
        `Hey ${username},`,
        '',
        `You haven't made your picks yet for ${leagueName}. These fixtures kick off in the next 24 hours:`,
        '',
        fixtureList + moreCount,
        '',
        `Make your predictions now: ${siteUrl}/tournaments/${tournamentId}`,
        '',
        '— predictr',
      ].join('\n'),
    })

    if (error) {
      errors.push(`${userId}: ${error.message}`)
    } else {
      nudged++
    }
  }

  return NextResponse.json({ ok: true, nudged, errors: errors.length ? errors : undefined })
}
