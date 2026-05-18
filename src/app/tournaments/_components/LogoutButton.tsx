'use client'

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-fg-3 transition hover:border-fg-3 hover:text-fg-2"
    >
      Log out
    </button>
  )
}
