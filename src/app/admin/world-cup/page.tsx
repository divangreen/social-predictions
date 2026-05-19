import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import { WC2026_GROUPS, WC_TOURNAMENT_ID } from '@/lib/wc2026-groups'
import Link from 'next/link'

export default async function AdminWCPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.id)) redirect('/tournaments')

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
      // Group-stage scoring:
      //   5 pts — correct group winner
      //   3 pts — correct runner-up
      //   1 pt  — picked the right team but in the wrong position
      // delta pattern mirrors saveFixtureResult so re-scoring is idempotent.
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

  return (
    <main className="min-h-screen bg-pitch px-4 py-8">
      <div className="mx-auto max-w-lg">
        <Link href="/tournaments" className="mb-6 inline-flex items-center gap-1 text-sm text-fg-3 hover:text-fg-2">
          ← Tournaments
        </Link>
        <h1 className="mb-6 text-2xl font-black text-fg-1">Score WC Groups</h1>
        <p className="mb-6 text-sm text-fg-3">Enter actual group results to award points. 5pts correct winner, 3pts correct runner-up, 1pt each if teams placed in wrong position.</p>

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
      </div>
    </main>
  )
}
