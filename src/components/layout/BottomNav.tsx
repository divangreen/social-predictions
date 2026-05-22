'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const HIDDEN_PREFIXES = ['/login', '/onboarding', '/auth/', '/join']

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 3l9 9" />
      <path d="M9 21V12h6v9" />
      <path d="M5 10v11h14V10" />
    </svg>
  )
}

function PredictIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3c0 0 2 3.5 2 9s-2 9-2 9" />
      <path d="M3 12h18" />
      <path d="M4.5 7.5c2 1 4.8 1.5 7.5 1.5s5.5-.5 7.5-1.5" />
      <path d="M4.5 16.5c2-1 4.8-1.5 7.5-1.5s5.5.5 7.5 1.5" />
    </svg>
  )
}

function WCIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 21v-4" />
      <path d="M7 4h10l1 8c0 3.3-2.7 6-6 6s-6-2.7-6-6l1-8z" />
      <path d="M4.5 9H3a1 1 0 00-1 1v1a4 4 0 004 4h.5" />
      <path d="M19.5 9H21a1 1 0 011 1v1a4 4 0 01-4 4h-.5" />
    </svg>
  )
}

function LeagueIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function MeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

export function BottomNav({
  tournamentId,
  firstLeagueId,
}: {
  tournamentId: string
  firstLeagueId: string | null
}) {
  const pathname = usePathname()

  if (HIDDEN_PREFIXES.some(p => pathname.startsWith(p))) return null

  const tabs = [
    {
      href: '/tournaments',
      label: 'Home',
      Icon: HomeIcon,
      active: pathname === '/tournaments',
    },
    {
      href: `/tournaments/${tournamentId}`,
      label: 'Predict',
      Icon: PredictIcon,
      active: pathname.startsWith(`/tournaments/${tournamentId}`),
    },
    {
      href: firstLeagueId ? `/leagues/${firstLeagueId}` : '/leagues/new',
      label: 'League',
      Icon: LeagueIcon,
      active: pathname.startsWith('/leagues'),
    },
    {
      href: '/world-cup',
      label: 'WC Hub',
      Icon: WCIcon,
      active: pathname.startsWith('/world-cup'),
    },
    {
      href: '/profile',
      label: 'Me',
      Icon: MeIcon,
      active: pathname.startsWith('/profile'),
    },
  ]

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 flex h-16 items-stretch border-t border-border bg-surface-1/95 backdrop-blur-sm">
      {tabs.map(({ href, label, Icon, active }) => (
        <Link
          key={href}
          href={href}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${
            active ? 'text-gold' : 'text-fg-3 hover:text-fg-2'
          }`}
        >
          <Icon active={active} />
          <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
        </Link>
      ))}
    </nav>
  )
}
