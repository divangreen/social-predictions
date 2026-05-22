import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

const PENDING_INVITE_COOKIE = 'pending_invite'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  if (!code && (!token_hash || !type)) {
    return NextResponse.redirect(new URL('/login?error=missing_token', request.url))
  }

  // Extract invite code from next param if it's a /join/ URL
  const inviteCodeMatch = next.match(/^\/join\/([A-Z0-9]+)$/i)
  const inviteCode = inviteCodeMatch?.[1]?.toUpperCase() ?? null

  const defaultRedirect = inviteCode ? '/' : next
  const response = NextResponse.redirect(new URL(defaultRedirect, request.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  let authError: string | null = null

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) authError = error.message
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (error) authError = error.message
  }

  if (authError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(authError)}`, request.url)
    )
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login?error=missing_token', request.url))
  }

  const { data: existingProfile } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  const isNewUser = !existingProfile

  await supabase.from('users').upsert(
    { id: user.id, username: user.email!.split('@')[0] },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  // New user: redirect to onboarding; store invite code in cookie to pick up after
  if (isNewUser) {
    const onboardingRedirect = NextResponse.redirect(new URL('/onboarding', request.url))
    response.cookies.getAll().forEach(({ name, value, ...rest }) => {
      onboardingRedirect.cookies.set(name, value, rest as Parameters<typeof onboardingRedirect.cookies.set>[2])
    })
    if (inviteCode) {
      onboardingRedirect.cookies.set(PENDING_INVITE_COOKIE, inviteCode, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 30, // 30 min
      })
    }
    return onboardingRedirect
  }

  // Existing user with invite: auto-join and redirect to league
  if (inviteCode) {
    const { data: league } = await supabase
      .from('leagues')
      .select('id')
      .eq('invite_code', inviteCode)
      .single()

    if (league) {
      await supabase
        .from('league_members')
        .upsert({ league_id: league.id, user_id: user.id }, { onConflict: 'league_id,user_id', ignoreDuplicates: true })

      const leagueRedirect = NextResponse.redirect(new URL(`/leagues/${league.id}`, request.url))
      response.cookies.getAll().forEach(({ name, value, ...rest }) => {
        leagueRedirect.cookies.set(name, value, rest as Parameters<typeof leagueRedirect.cookies.set>[2])
      })
      return leagueRedirect
    }
  }

  // Default: redirect to next or /
  const finalRedirect = inviteCode ? '/tournaments' : next
  const finalResponse = NextResponse.redirect(new URL(finalRedirect, request.url))
  response.cookies.getAll().forEach(({ name, value, ...rest }) => {
    finalResponse.cookies.set(name, value, rest as Parameters<typeof finalResponse.cookies.set>[2])
  })
  return finalResponse
}
