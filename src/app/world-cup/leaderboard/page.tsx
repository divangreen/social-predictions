import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { WC_TOURNAMENT_ID } from '@/lib/wc2026-groups'

export const revalidate = 60

export default async function WCLeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: preds } = await supabase
    .from('bracket_predictions')
    .select('user_id, points_earned')
    .eq('tournament_id', WC_TOURNAMENT_ID)

  if (!preds?.length) {
    return (
      <main className="min-h-screen bg-pitch px-4 py-8">
        <div className="mx-auto max-w-lg">
          <Link href="/world-cup/bracket" className="mb-6 inline-flex items-center gap-1 text-sm text-fg-3 hover:text-fg-1">
            ← My Picks
          </Link>
          <h1 className="mb-6 text-2xl font-black text-fg-1">WC Leaderboard</h1>
          <div className="rounded-2xl border border-border bg-surface-1 p-10 text-center">
            <p className="text-fg-2">No picks submitted yet.</p>
            <Link href="/world-cup/bracket" className="mt-4 inline-block text-sm font-bold text-fg-1 underline underline-offset-2">
              Submit your picks →
            </Link>
          </div>
        </div>
      </main>
    )
  }

  type UserRow = { user_id: string; totalPoints: number; groupsScored: number; groupsSubmitted: number }
  const userMap = new Map<string, UserRow>()
  for (const pred of preds) {
    const existing = userMap.get(pred.user_id) ?? { user_id: pred.user_id, totalPoints: 0, groupsScored: 0, groupsSubmitted: 0 }
    existing.groupsSubmitted += 1
    if (pred.points_earned !== null) {
      existing.totalPoints += pred.points_earned
      existing.groupsScored += 1
    }
    userMap.set(pred.user_id, existing)
  }

  const userIds = Array.from(userMap.keys())
  const { data: users } = await supabase
    .from('users')
    .select('id, username')
    .in('id', userIds)

  const usernameMap = new Map((users ?? []).map(u => [u.id, u.username]))

  const ranked = Array.from(userMap.values())
    .map(row => ({ ...row, username: usernameMap.get(row.user_id) ?? 'Unknown' }))
    .sort((a, b) => b.totalPoints - a.totalPoints || b.groupsSubmitted - a.groupsSubmitted)

  const scoringStarted = ranked.some(r => r.groupsScored > 0)
  const myRank = ranked.findIndex(r => r.user_id === user.id) + 1
  const myRow = ranked.find(r => r.user_id === user.id)

  return (
    <main className="min-h-screen bg-pitch px-4 py-8">
      <div className="mx-auto max-w-lg">

        <Link href="/world-cup/bracket" className="mb-6 inline-flex items-center gap-1 text-sm text-fg-3 hover:text-fg-1">
          ← My Picks
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-black text-fg-1">WC Leaderboard</h1>
          <p className="mt-1 text-sm text-fg-3">
            {scoringStarted ? 'Group stage points' : 'Scoring starts after June 12 — picks submitted so far'}
          </p>
        </div>

        {/* My rank pill */}
        {myRow && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3">
            <span className="text-sm font-bold text-fg-2">Your rank</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xl font-black text-fg-1">#{myRank}</span>
              <span className="font-mono text-sm text-fg-3">
                {myRow.totalPoints}pts · {myRow.groupsSubmitted}/12 groups
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {ranked.map((row, i) => {
            const isMe = row.user_id === user.id
            const rank = i + 1
            const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
            return (
              <div
                key={row.user_id}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                  isMe
                    ? 'border-border bg-surface-2'
                    : 'border-border bg-surface-1'
                }`}
              >
                <div className="w-8 shrink-0 text-center">
                  {rankEmoji ? (
                    <span className="text-lg">{rankEmoji}</span>
                  ) : (
                    <span className="font-mono text-sm text-fg-3">#{rank}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-bold ${isMe ? 'text-fg-1' : 'text-fg-1'}`}>
                    {row.username}{isMe ? ' (you)' : ''}
                  </p>
                  <p className="text-xs text-fg-3">
                    {row.groupsSubmitted}/12 groups submitted
                    {row.groupsScored > 0 && ` · ${row.groupsScored} scored`}
                  </p>
                </div>
                <span className={`shrink-0 font-mono text-lg font-black ${
                  scoringStarted
                    ? row.totalPoints > 0 ? 'text-fg-1' : 'text-fg-3'
                    : 'text-fg-3'
                }`}>
                  {scoringStarted ? `${row.totalPoints}` : '—'}
                </span>
              </div>
            )
          })}
        </div>

      </div>
    </main>
  )
}
