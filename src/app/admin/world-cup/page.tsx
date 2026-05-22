import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import { WC2026_GROUPS, WC_TOURNAMENT_ID } from '@/lib/wc2026-groups'
import { ROUND_POINTS, type BracketRound } from '@/lib/wc2026-bracket'
import Link from 'next/link'

const KNOCKOUT_ROUNDS: { round: BracketRound; label: string; slots: number }[] = [
  { round: 'r32', label: 'Round of 32', slots: 16 },
  { round: 'r16', label: 'Round of 16', slots: 8 },
  { round: 'qf',  label: 'Quarter-finals', slots: 4 },
  { round: 'sf',  label: 'Semi-finals', slots: 2 },
]

export default async function AdminWCPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.id)) redirect('/tournaments')

  // ── Group scoring ──────────────────────────────────────────────────────────
  async function scoreGroup(formData: FormData) {
    'use server'
    const supabaseAdmin = await createClient()
    const { data: { user: actionUser } } = await supabaseAdmin.auth.getUser()
    if (!actionUser || !isAdmin(actionUser.id)) return

    const letter = formData.get('letter') as string
    const actual_first = formData.get('actual_first') as string
    const actual_second = formData.get('actual_second') as string
    if (!letter || !actual_first || !actual_second) return

    const { data: preds } = await supabaseAdmin
      .from('bracket_predictions')
      .select('id, user_id, first_place, second_place, points_earned')
      .eq('tournament_id', WC_TOURNAMENT_ID)
      .eq('group_letter', letter)

    if (!preds?.length) return

    for (const pred of preds) {
      // 5pts correct winner, 3pts correct runner-up, 1pt if team placed in wrong position
      const newPts =
        (pred.first_place === actual_first ? 5 : 0) +
        (pred.second_place === actual_second ? 3 : 0) +
        (pred.first_place === actual_second ? 1 : 0) +
        (pred.second_place === actual_first ? 1 : 0)

      const delta = newPts - (pred.points_earned ?? 0)

      await supabaseAdmin
        .from('bracket_predictions')
        .update({ points_earned: newPts })
        .eq('id', pred.id)

      if (delta !== 0) {
        await supabaseAdmin.rpc('increment_user_points', { p_user_id: pred.user_id, p_delta: delta })
      }
    }
  }

  // ── Knockout round scoring ─────────────────────────────────────────────────
  async function scoreKnockoutRound(formData: FormData) {
    'use server'
    const supabaseAdmin = await createClient()
    const { data: { user: actionUser } } = await supabaseAdmin.auth.getUser()
    if (!actionUser || !isAdmin(actionUser.id)) return

    const round = formData.get('round') as BracketRound
    if (!round) return

    const slots = parseInt(formData.get('slots') as string)
    const actualWinners: (string | null)[] = Array.from({ length: slots }, (_, i) => {
      const v = formData.get(`winner_${i}`) as string
      return v?.trim() || null
    })

    const pointsPerPick = ROUND_POINTS[round]

    const { data: allKnockout } = await supabaseAdmin
      .from('knockout_picks')
      .select('id, user_id, picks, points_earned')
      .eq('tournament_id', WC_TOURNAMENT_ID)

    if (!allKnockout?.length) return

    for (const row of allKnockout) {
      const picks = row.picks as unknown as Record<string, (string | null)[]>
      const userPicks: (string | null)[] = picks[round] ?? []

      let roundPoints = 0
      for (let i = 0; i < slots; i++) {
        if (actualWinners[i] && userPicks[i] === actualWinners[i]) {
          roundPoints += pointsPerPick
        }
      }

      // Rebuild per-round points by re-reading old stored value keyed by round
      // We store a breakdown in a sidecar field to support idempotent re-scoring.
      // Since knockout_picks.points_earned is a single number, we use a simple
      // approach: store all round totals in picks.__scored__ map and recompute total.
      const scoredMap: Record<string, number> = ((picks.__scored__ as unknown) as Record<string, number>) ?? {}
      const oldRoundPts = scoredMap[round] ?? 0
      scoredMap[round] = roundPoints

      const newTotal = Object.values(scoredMap).reduce((s, v) => s + v, 0)
      const oldTotal = row.points_earned ?? 0
      const delta = newTotal - oldTotal

      await supabaseAdmin
        .from('knockout_picks')
        .update({ points_earned: newTotal, picks: { ...picks, __scored__: scoredMap } })
        .eq('id', row.id)

      if (delta !== 0) {
        await supabaseAdmin.rpc('increment_user_points', { p_user_id: row.user_id, p_delta: delta })
      }
    }
  }

  // ── Champion pick scoring ──────────────────────────────────────────────────
  async function scoreChampion(formData: FormData) {
    'use server'
    const supabaseAdmin = await createClient()
    const { data: { user: actionUser } } = await supabaseAdmin.auth.getUser()
    if (!actionUser || !isAdmin(actionUser.id)) return

    const actualChampion = (formData.get('champion') as string)?.trim()
    if (!actualChampion) return

    const { data: allKnockout } = await supabaseAdmin
      .from('knockout_picks')
      .select('id, user_id, picks, points_earned')
      .eq('tournament_id', WC_TOURNAMENT_ID)

    if (!allKnockout?.length) return

    for (const row of allKnockout) {
      const picks = row.picks as unknown as Record<string, unknown>
      const userChampion = picks.champion as string | null
      const correct = userChampion === actualChampion

      const scoredMap: Record<string, number> = ((picks.__scored__ as unknown) as Record<string, number>) ?? {}
      const oldPts = scoredMap.champion ?? 0
      const newPts = correct ? ROUND_POINTS.final : 0
      scoredMap.champion = newPts

      const newTotal = Object.values(scoredMap).reduce((s, v) => s + v, 0)
      const oldTotal = row.points_earned ?? 0
      const delta = newTotal - oldTotal

      await supabaseAdmin
        .from('knockout_picks')
        .update({ points_earned: newTotal, picks: { ...picks, __scored__: scoredMap } })
        .eq('id', row.id)

      if (delta !== 0) {
        await supabaseAdmin.rpc('increment_user_points', { p_user_id: row.user_id, p_delta: delta })
      }
    }
  }

  const ALL_WC_TEAMS = WC2026_GROUPS.flatMap(g => g.teams).sort()

  return (
    <main className="min-h-screen bg-pitch px-4 py-8">
      <div className="mx-auto max-w-lg space-y-12">
        <div>
          <Link href="/tournaments" className="mb-6 inline-flex items-center gap-1 text-sm text-fg-3 hover:text-fg-2">
            ← Tournaments
          </Link>
          <h1 className="mt-2 text-2xl font-black text-fg-1">WC Admin</h1>
        </div>

        {/* ── Group scoring ── */}
        <section>
          <h2 className="mb-1 text-base font-black text-fg-1">Score Groups</h2>
          <p className="mb-4 text-sm text-fg-3">5pts correct winner · 3pts correct runner-up · 1pt wrong position.</p>
          <div className="space-y-3">
            {WC2026_GROUPS.map(group => (
              <form key={group.letter} action={scoreGroup} className="rounded-2xl border border-border bg-surface-1 p-4">
                <input type="hidden" name="letter" value={group.letter} />
                <p className="mb-3 text-xs font-black uppercase tracking-widest text-fg-3">Group {group.letter}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-fg-2">Actual Winner</label>
                    <select name="actual_first" className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-fg-1 outline-none">
                      <option value="">Select…</option>
                      {group.teams.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-fg-2">Actual Runner-up</label>
                    <select name="actual_second" className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-fg-1 outline-none">
                      <option value="">Select…</option>
                      {group.teams.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" className="mt-3 w-full rounded-xl bg-fg-1 py-2 text-xs font-bold text-pitch hover:opacity-90">
                  Score Group {group.letter}
                </button>
              </form>
            ))}
          </div>
        </section>

        {/* ── Knockout round scoring ── */}
        <section>
          <h2 className="mb-1 text-base font-black text-fg-1">Score Knockout Rounds</h2>
          <p className="mb-4 text-sm text-fg-3">Enter actual winners per match. Re-submitting is safe — scoring is idempotent.</p>
          <div className="space-y-3">
            {KNOCKOUT_ROUNDS.map(({ round, label, slots }) => (
              <form key={round} action={scoreKnockoutRound} className="rounded-2xl border border-border bg-surface-1 p-4">
                <input type="hidden" name="round" value={round} />
                <input type="hidden" name="slots" value={slots} />
                <p className="mb-1 text-xs font-black uppercase tracking-widest text-fg-3">{label}</p>
                <p className="mb-3 text-xs text-fg-3">{ROUND_POINTS[round]} pt{ROUND_POINTS[round] > 1 ? 's' : ''} per correct pick</p>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: slots }, (_, i) => (
                    <div key={i}>
                      <label className="mb-1 block text-xs font-semibold text-fg-2">Match {i + 1} winner</label>
                      <select name={`winner_${i}`} className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-fg-1 outline-none">
                        <option value="">Select…</option>
                        {ALL_WC_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <button type="submit" className="mt-3 w-full rounded-xl bg-fg-1 py-2 text-xs font-bold text-pitch hover:opacity-90">
                  Score {label}
                </button>
              </form>
            ))}
          </div>
        </section>

        {/* ── Champion scoring ── */}
        <section>
          <h2 className="mb-1 text-base font-black text-fg-1">Score Champion</h2>
          <p className="mb-4 text-sm text-fg-3">{ROUND_POINTS.final} pts for correct champion pick.</p>
          <form action={scoreChampion} className="rounded-2xl border border-border bg-surface-1 p-4">
            <label className="mb-1 block text-xs font-semibold text-fg-2">Actual Champion</label>
            <select name="champion" className="mb-3 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-fg-1 outline-none">
              <option value="">Select…</option>
              {ALL_WC_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button type="submit" className="w-full rounded-xl bg-fg-1 py-2 text-xs font-bold text-pitch hover:opacity-90">
              Score Champion Pick
            </button>
          </form>
        </section>

      </div>
    </main>
  )
}
