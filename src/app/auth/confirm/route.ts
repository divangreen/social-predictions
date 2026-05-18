import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  if (!code && (!token_hash || !type)) {
    return NextResponse.redirect(new URL('/login?error=missing_token', request.url))
  }

  const response = NextResponse.redirect(new URL(next, request.url))

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
    // PKCE flow — newer Supabase projects
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) authError = error.message
  } else if (token_hash && type) {
    // OTP flow — older format
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (error) authError = error.message
  }

  if (authError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(authError)}`, request.url)
    )
  }

  // Ensure user row exists in public.users; detect new signup for onboarding
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
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

    if (isNewUser) {
      const onboardingRedirect = NextResponse.redirect(new URL('/onboarding', request.url))
      response.cookies.getAll().forEach(({ name, value, ...rest }) => {
        onboardingRedirect.cookies.set(name, value, rest as Parameters<typeof onboardingRedirect.cookies.set>[2])
      })
      return onboardingRedirect
    }
  }

  return response
}
