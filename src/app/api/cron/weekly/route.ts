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

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Get all scored predictions from the past week
  const { data: recentPredictions } = await supabase
    .from('predictions')
    .select('user_id, fixture_id, points_earned, is_perfect')
    .not('points_earned', 'is', null)
    .gte('created_at', weekAgo.toISOString())

  // Get upcoming fixtures in the next 7 days
  const { data: upcomingFixtures } = await supabase
    .from('fixtures')
    .select('id, tournament_id, home_team_name, away_team_name, kickoff_time')
    .eq('status', 'scheduled')
    .gte('kickoff_time', now.toISOString())
    .lte('kickoff_time', in7days.toISOString())
    .order('kickoff_time', { ascending: true })
    .limit(5)

  // Get all active league members
  const { data: leagueMembers } = await supabase
    .from('league_members')
    .select('user_id, league_id')

  if (!leagueMembers?.length) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no league members' })
  }

  const activeUserIds = [...new Set(leagueMembers.map(m => m.user_id))]

  // Fetch auth emails
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map(
    (authUsers?.users ?? [])
      .filter(u => activeUserIds.includes(u.id) && u.email)
      .map(u => [u.id, u.email!])
  )

  // Fetch profiles
  const { data: profileRows } = await supabase
    .from('users')
    .select('id, username, total_points')
    .in('id', activeUserIds)

  const profileMap = new Map((profileRows ?? []).map(u => [u.id, u]))

  // Build per-user weekly stats
  const userWeeklyStats = new Map<string, { ptsThisWeek: number; correct: number; perfect: number }>()
  for (const pred of (recentPredictions ?? [])) {
    const s = userWeeklyStats.get(pred.user_id) ?? { ptsThisWeek: 0, correct: 0, perfect: 0 }
    s.ptsThisWeek += pred.points_earned ?? 0
    if ((pred.points_earned ?? 0) > 0) s.correct += 1
    if (pred.is_perfect) s.perfect += 1
    userWeeklyStats.set(pred.user_id, s)
  }

  let sent = 0
  const errors: string[] = []

  for (const userId of activeUserIds) {
    const email = emailMap.get(userId)
    if (!email) continue

    const profile = profileMap.get(userId)
    const username = profile?.username ?? 'predictor'
    const totalPoints = profile?.total_points ?? 0
    const weekStats = userWeeklyStats.get(userId)

    const weekSummary = weekStats
      ? [
          `This week: +${weekStats.ptsThisWeek} pts · ${weekStats.correct} correct${weekStats.perfect > 0 ? ` · ${weekStats.perfect} perfect` : ''}`,
          `Total: ${totalPoints} pts`,
        ].join('\n')
      : `Total: ${totalPoints} pts`

    const upcomingText = upcomingFixtures?.length
      ? [
          '',
          'Upcoming matches to predict:',
          ...(upcomingFixtures.slice(0, 5).map(f => {
            const ko = new Date(f.kickoff_time)
            const day = ko.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
            return `• ${f.home_team_name} vs ${f.away_team_name} — ${day}`
          })),
        ].join('\n')
      : ''

    const { error } = await resend.emails.send({
      from: 'predictr <noreply@predictr.app>',
      to: email,
      subject: weekStats
        ? `predictr weekly: +${weekStats.ptsThisWeek} pts this week`
        : 'predictr weekly digest',
      text: [
        `Hey ${username},`,
        '',
        "Here's your predictr weekly summary:",
        '',
        weekSummary,
        upcomingText,
        '',
        `View your predictions: ${siteUrl}/profile`,
        `Make new picks: ${siteUrl}/tournaments`,
        '',
        '— predictr',
        '',
        `Unsubscribe: reply "unsubscribe" to this email`,
      ].join('\n'),
    })

    if (error) {
      errors.push(`${userId}: ${error.message}`)
    } else {
      sent++
    }
  }

  return NextResponse.json({ ok: true, sent, errors: errors.length ? errors : undefined })
}
