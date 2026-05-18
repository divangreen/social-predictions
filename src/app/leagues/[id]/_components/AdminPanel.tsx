'use client'

import { useState, useTransition } from 'react'
import { deleteLeague, removeMember, renameLeague, regenerateInvite } from '../actions'

interface Member {
  userId: string
  username: string
}

interface Props {
  leagueId: string
  leagueName: string
  members: Member[]
  currentUserId: string
}

export function AdminPanel({ leagueId, leagueName, members, currentUserId }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'settings' | 'members'>('settings')
  const [name, setName] = useState(leagueName)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function flash(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 2500)
  }

  function handleRename() {
    startTransition(async () => {
      const res = await renameLeague(leagueId, name)
      if (res?.error) flash(res.error)
      else flash('League renamed')
    })
  }

  function handleRegenerate() {
    startTransition(async () => {
      await regenerateInvite(leagueId)
      flash('New invite link generated')
    })
  }

  function handleRemove(userId: string, username: string) {
    if (!confirm(`Remove ${username} from the league?`)) return
    startTransition(async () => {
      const res = await removeMember(leagueId, userId)
      if (res?.error) flash(res.error)
      else flash(`${username} removed`)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteLeague(leagueId)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-fg-3 transition hover:border-fg-3 hover:text-fg-2"
      >
        ⚙ Admin
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-8 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface-1 p-5 max-h-[85vh] overflow-y-auto">

            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-black text-fg-1">League Admin</h2>
              <button onClick={() => { setOpen(false); setConfirmDelete(false) }} className="text-fg-3 hover:text-fg-2 text-xl leading-none">×</button>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex gap-1 rounded-xl bg-surface-2 p-1">
              {(['settings', 'members'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold capitalize transition ${
                    tab === t ? 'bg-surface-1 text-fg-1' : 'text-fg-3 hover:text-fg-2'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {feedback && (
              <p className="mb-3 rounded-xl bg-goal/10 px-3 py-2 text-xs font-bold text-goal">{feedback}</p>
            )}

            {/* Settings tab */}
            {tab === 'settings' && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-fg-3">League name</label>
                  <div className="flex gap-2">
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-fg-1 outline-none focus:border-fg-2"
                    />
                    <button
                      onClick={handleRename}
                      disabled={isPending || name.trim() === leagueName}
                      className="rounded-xl bg-fg-1 px-4 py-2 text-xs font-bold text-pitch transition hover:opacity-90 disabled:opacity-30"
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-fg-3">Invite link</label>
                  <button
                    onClick={handleRegenerate}
                    disabled={isPending}
                    className="w-full rounded-xl border border-border py-2 text-xs font-bold text-fg-2 transition hover:border-fg-3 hover:text-fg-1 disabled:opacity-30"
                  >
                    Regenerate invite code
                  </button>
                  <p className="mt-1 text-[10px] text-fg-3">Old link stops working immediately.</p>
                </div>

                <div className="border-t border-border pt-4">
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="w-full rounded-xl border border-live/30 py-2 text-xs font-bold text-live transition hover:bg-live/10"
                    >
                      Delete league
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-center text-xs font-bold text-live">This will delete the league for everyone. Are you sure?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="flex-1 rounded-xl border border-border py-2 text-xs font-bold text-fg-3 transition hover:text-fg-2"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDelete}
                          disabled={isPending}
                          className="flex-1 rounded-xl bg-live py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                        >
                          Yes, delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Members tab */}
            {tab === 'members' && (
              <div className="space-y-2">
                {members.map(m => (
                  <div key={m.userId} className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-1 text-xs font-bold text-fg-1">
                        {m.username[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-bold text-fg-1">
                        {m.username}
                        {m.userId === currentUserId && <span className="ml-1 text-xs text-gold">admin</span>}
                      </span>
                    </div>
                    {m.userId !== currentUserId && (
                      <button
                        onClick={() => handleRemove(m.userId, m.username)}
                        disabled={isPending}
                        className="text-xs font-bold text-live transition hover:opacity-70 disabled:opacity-30"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      )}
    </>
  )
}
