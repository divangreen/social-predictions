'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.06, ease },
  }),
}

export function AnimatedHeader({
  username,
  streak,
}: {
  username: string
  streak: number
}) {
  return (
    <motion.div
      className="mb-8 flex items-center justify-between"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease }}
    >
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-black tracking-tight text-fg-1">predictr</h1>
          {streak >= 2 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.3 }}
              className="rounded-full bg-live/10 px-2.5 py-1 text-xs font-black text-live"
            >
              🔥 {streak}
            </motion.span>
          )}
        </div>
        <p className="text-sm text-fg-3">Pick your scores. Beat your mates.</p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-sm font-black text-fg-1 transition hover:bg-border"
        >
          {username[0]?.toUpperCase() ?? '?'}
        </Link>
        <Link
          href="/leagues/new"
          className="rounded-xl bg-fg-1 px-4 py-2 text-sm font-bold text-pitch transition hover:opacity-90 active:scale-95"
        >
          + League
        </Link>
      </div>
    </motion.div>
  )
}

export function AnimatedWCHero({
  daysLeft,
  locked,
  tournamentId,
}: {
  daysLeft: number
  locked: boolean
  tournamentId: string
}) {
  return (
    <motion.div
      custom={0}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="mb-6"
    >
      <Link
        href="/world-cup"
        className="block rounded-3xl border border-white/10 bg-linear-to-br from-zinc-900 to-black p-6 transition hover:border-white/20 active:scale-[0.98] relative overflow-hidden"
      >
        {/* Subtle glow */}
        <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-gold/10 blur-2xl" />
        <div className="mb-4 flex items-start justify-between relative">
          <motion.span
            className="text-4xl"
            animate={{ rotate: [0, -5, 5, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
          >
            🏆
          </motion.span>
          {!locked ? (
            <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-xs font-black text-yellow-300">
              {daysLeft === 1 ? 'Last day!' : `${daysLeft} days to lock in`}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full border border-live/30 bg-live/10 px-3 py-1 text-xs font-black text-live">
              <span className="live-dot" />
              Live
            </span>
          )}
        </div>
        <h2 className="mb-1 text-xl font-black text-white relative">FIFA World Cup 2026</h2>
        <p className="mb-4 text-sm text-zinc-400 relative">48 teams · 12 groups · picks lock June 11</p>
        <div className="flex items-center justify-between relative">
          <div className="flex gap-4 text-xs text-zinc-500">
            <span>⚽ Group picks</span>
            <span>🏅 Knockout</span>
            <span>🌍 Champion</span>
          </div>
          <span className="text-sm font-bold text-zinc-300">Go →</span>
        </div>
      </Link>
    </motion.div>
  )
}

type LeagueItem = { id: string; name: string; tournament_id: string }

export function AnimatedLeagueList({
  leagues,
}: {
  leagues: LeagueItem[]
}) {
  if (leagues.length === 0) {
    return (
      <motion.div
        custom={1}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="mb-6 rounded-2xl border border-border bg-surface-1 p-6 text-center"
      >
        <p className="mb-1 font-bold text-fg-1">No leagues yet</p>
        <p className="mb-4 text-sm text-fg-3">Create one and challenge your mates.</p>
        <Link
          href="/leagues/new"
          className="inline-block rounded-xl bg-fg-1 px-5 py-2 text-sm font-bold text-pitch transition hover:opacity-90"
        >
          Create a league
        </Link>
        <p className="mt-3 text-xs text-fg-3">
          Got an invite?{' '}
          <Link href="/join" className="text-fg-2 underline underline-offset-2 hover:text-fg-1 transition">
            Enter your code here
          </Link>
        </p>
      </motion.div>
    )
  }

  return (
    <div className="mb-6">
      <motion.h2
        custom={1}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="mb-3 text-xs font-bold uppercase tracking-widest text-fg-3"
      >
        My Leagues
      </motion.h2>
      <div className="space-y-2">
        {leagues.map((league, i) => (
          <motion.div
            key={league.id}
            custom={i + 2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
          >
            <Link
              href={`/leagues/${league.id}`}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-5 py-3.5 transition hover:border-fg-3 active:scale-[0.98]"
            >
              <p className="text-sm font-bold text-fg-1">{league.name}</p>
              <span className="text-fg-3">→</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export function AnimatedQuickLinks({
  tournamentId,
  startIndex,
}: {
  tournamentId: string
  startIndex: number
}) {
  const links = [
    { href: '/world-cup/bracket', label: 'Group picks', sub: 'Pick 1st & 2nd' },
    { href: '/world-cup/knockout', label: 'Knockout bracket', sub: 'Pick your path' },
    { href: `/tournaments/${tournamentId}`, label: 'Match scores', sub: 'Predict scorelines' },
    { href: '/world-cup/leaderboard', label: 'Leaderboard', sub: 'See rankings' },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {links.map((link, i) => (
        <motion.div
          key={link.href}
          custom={startIndex + i}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <Link
            href={link.href}
            className="block rounded-2xl border border-border bg-surface-1 px-4 py-3 transition hover:border-fg-3 active:scale-[0.98]"
          >
            <p className="text-sm font-bold text-fg-1">{link.label}</p>
            <p className="text-xs text-fg-3">{link.sub}</p>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
