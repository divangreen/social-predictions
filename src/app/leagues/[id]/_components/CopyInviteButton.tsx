'use client'

import { useState } from 'react'

export function CopyInviteButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex-1 rounded-xl bg-fg-1 py-2 text-sm font-bold text-pitch transition hover:opacity-90 active:scale-95"
    >
      {copied ? '✓ Copied!' : 'Copy link'}
    </button>
  )
}
