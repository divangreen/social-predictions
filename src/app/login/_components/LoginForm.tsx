'use client'

import { useState } from 'react'
import { sendMagicLink } from '../actions'
import { createClient } from '@/lib/supabase'

const URL_ERROR_MESSAGES: Record<string, string> = {
  missing_token: 'That sign-in link has expired. Enter your email to get a fresh one.',
}

export default function LoginForm({ urlError, next, joinLeagueName }: { urlError: string | null; next: string | null; joinLeagueName?: string | null }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    const supabase = createClient()
    const redirectTo = next
      ? `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`
      : `${window.location.origin}/auth/confirm`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    const { error } = await sendMagicLink(email, next ?? undefined)
    if (error) {
      setErrorMsg(error)
      setStatus('error')
    } else {
      setStatus('sent')
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-pitch px-6">
      <div className="w-full max-w-sm space-y-6">

        {/* Join context banner */}
        {joinLeagueName ? (
          <div className="rounded-2xl border border-gold/30 bg-gold/5 px-4 py-3 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-gold">You&apos;re invited</p>
            <p className="mt-0.5 text-base font-black text-fg-1">{joinLeagueName}</p>
            <p className="mt-0.5 text-xs text-fg-3">Sign in to join this league</p>
          </div>
        ) : (
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tight text-fg-1">predictr</h1>
            <p className="mt-2 text-sm text-fg-3">Predict. Compete. Brag.</p>
          </div>
        )}

        {/* WC urgency chip */}
        <div className="flex justify-center">
          <span className="rounded-full border border-gold/30 bg-gold/5 px-3 py-1 text-xs font-bold text-gold">
            🏆 World Cup 2026 · picks lock June 11
          </span>
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface-1 py-3 text-sm font-semibold text-fg-1 transition hover:bg-surface-2 disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {googleLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-fg-3">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {urlError && status === 'idle' && (
          <div className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
            {URL_ERROR_MESSAGES[urlError] ?? 'Something went wrong. Please try again.'}
          </div>
        )}

        {status === 'sent' ? (
          <div className="rounded-2xl border border-border bg-surface-1 p-6 text-center">
            <p className="text-lg font-semibold text-fg-1">Check your email</p>
            <p className="mt-2 text-sm text-fg-3">
              We sent a magic link to <span className="text-fg-1">{email}</span>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-fg-2 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border bg-surface-1 px-4 py-3 text-fg-1 placeholder-fg-3 outline-none transition focus:border-fg-3"
              />
            </div>

            {status === 'error' && (
              <p className="text-sm text-live">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-xl bg-fg-1 py-3 text-sm font-semibold text-pitch transition hover:opacity-90 disabled:opacity-50"
            >
              {status === 'loading' ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
