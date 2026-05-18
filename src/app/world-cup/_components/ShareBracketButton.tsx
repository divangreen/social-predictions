'use client'

import { useState } from 'react'

export default function ShareBracketButton({ username, siteUrl }: { username: string; siteUrl: string }) {
  const [copied, setCopied] = useState(false)

  const shareUrl = `${siteUrl}/world-cup/u/${encodeURIComponent(username)}`
  const text = `I've submitted my WC 2026 bracket on predictr — think you can beat me?`

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My WC 2026 bracket', text, url: shareUrl })
        return
      } catch {
        // Fallthrough to clipboard
      }
    }
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleShare}
      className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 py-3 text-sm font-bold text-white transition hover:bg-zinc-800 active:scale-[0.98]"
    >
      {copied ? 'Link copied!' : 'Share my picks'}
    </button>
  )
}
