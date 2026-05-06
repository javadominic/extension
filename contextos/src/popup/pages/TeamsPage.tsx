import { useState, useEffect } from 'react'
import Toast from '../../components/Toast'
import { getSettings, saveSettings, getCachedBookmarks } from '../../lib/storage'
import { db } from '../../lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import type { BrainBookmark, AppSettings, TeamData } from '../../types'

export default function TeamsPage() {
  const [settings,  setSettings]  = useState<AppSettings | null>(null)
  const [team,      setTeam]      = useState<TeamData | null>(null)
  const [teamName,  setTeamName]  = useState('')
  const [joinCode,  setJoinCode]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [bookmarks, setBookmarks] = useState<BrainBookmark[]>([])
  const [toast,     setToast]     = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [copied,    setCopied]    = useState(false)

  useEffect(() => {
    async function load() {
      const s = await getSettings()
      setSettings(s)
      const bms = await getCachedBookmarks()
      setBookmarks(bms)
      if (s.teamId && s.firebaseUid) {
        try {
          const snap = await getDoc(doc(db, 'teams', s.teamId))
          if (snap.exists()) setTeam({ id: snap.id, ...snap.data() } as TeamData)
        } catch {}
      }
    }
    load()
  }, [])

  async function handleCreateTeam() {
    if (!teamName.trim() || !settings?.firebaseUid) return
    setLoading(true)
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'CREATE_TEAM',
        payload: { teamName: teamName.trim(), uid: settings.firebaseUid }
      })
      if (!res?.success) throw new Error(res?.error || 'Unknown error')
      const refId = res.data
      const newSettings = { ...settings, teamId: refId }
      await saveSettings(newSettings)
      setSettings(newSettings)
      setTeam({ id: refId, name: teamName.trim(), members: [settings.firebaseUid], sharedBookmarks: [] })
      setToast({ msg: 'Team created!', type: 'success' })
    } catch (err) {
      setToast({ msg: `Error: ${(err as Error).message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleJoinTeam() {
    if (!joinCode.trim() || !settings?.firebaseUid) return
    setLoading(true)
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'JOIN_TEAM',
        payload: { joinCode: joinCode.trim(), uid: settings.firebaseUid }
      })
      if (!res?.success) throw new Error(res?.error || 'Unknown error')
      
      const newSettings = { ...settings, teamId: joinCode.trim() }
      await saveSettings(newSettings)
      setSettings(newSettings)
      setTeam(res.data as TeamData)
      setToast({ msg: 'Joined team!', type: 'success' })
    } catch (err) {
      setToast({ msg: `Error: ${(err as Error).message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleShareBookmark(bm: BrainBookmark) {
    if (!settings?.teamId || !settings.firebaseUid) return
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'SHARE_BOOKMARK',
        payload: { bm, teamId: settings.teamId, uid: settings.firebaseUid }
      })
      if (!res?.success) throw new Error(res?.error || 'Unknown error')
      
      if (team && team.id) {
        setTeam({ ...team, id: team.id, sharedBookmarks: [...team.sharedBookmarks, bm.id] })
      }
      setToast({ msg: 'Shared with team!', type: 'success' })
    } catch (err) {
      setToast({ msg: `Error: ${(err as Error).message}`, type: 'error' })
    }
  }

  if (!settings?.firebaseUid) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-3">
        <span className="text-5xl">👥</span>
        <p className="text-slate-200 font-semibold text-sm">Sign in to use Teams</p>
        <p className="text-slate-500 text-xs">Go to Settings and sign in with Google to collaborate.</p>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="flex flex-col h-full px-3 pt-4 pb-3 gap-4">
        {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}

        <div className="text-center mb-2">
          <span className="text-4xl block mb-2">👥</span>
          <p className="text-slate-200 font-bold text-sm">Create or Join a Team</p>
          <p className="text-slate-500 text-xs mt-1">Collaborate on bookmarks with your teammates</p>
        </div>

        {/* Create team */}
        <div className="glass-card p-3 space-y-2">
          <p className="text-xs font-semibold text-slate-400">Create a new team</p>
          <input
            id="team-name-input"
            className="input-field"
            placeholder="Team name…"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
          <button
            id="create-team-btn"
            onClick={handleCreateTeam}
            disabled={loading || !teamName.trim()}
            className="btn-primary w-full"
          >
            {loading ? 'Creating…' : 'Create Team'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-surface-border" />
          <span className="text-xs text-slate-600">or</span>
          <div className="flex-1 h-px bg-surface-border" />
        </div>

        {/* Join team */}
        <div className="glass-card p-3 space-y-2">
          <p className="text-xs font-semibold text-slate-400">Join by team ID</p>
          <input
            id="join-code-input"
            className="input-field"
            placeholder="Team ID / invite code…"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <button
            id="join-team-btn"
            onClick={handleJoinTeam}
            disabled={loading || !joinCode.trim()}
            className="btn-ghost w-full"
          >
            {loading ? 'Joining…' : 'Join Team'}
          </button>
        </div>
      </div>
    )
  }

  // Team view
  function handleCopyId() {
    if (!team?.id) return
    navigator.clipboard.writeText(team.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleLeaveTeam() {
    const newSettings = { ...settings, teamId: undefined }
    await saveSettings(newSettings as any)
    setSettings(newSettings as any)
    setTeam(null)
    setToast({ msg: 'Left team.', type: 'success' })
  }

  return (
    <div className="flex flex-col h-full">
      {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}

      {/* Team header */}
      <div className="px-3 pt-3 pb-2 border-b border-surface-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-lg">
            👥
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-100 text-sm">{team.name}</p>
            <p className="text-xs text-slate-500">{team.members.length} member{team.members.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={handleLeaveTeam}
            className="text-[10px] text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 px-2 py-1 rounded-lg transition-all"
          >
            Leave
          </button>
        </div>

        {/* Full copyable team ID */}
        <div className="flex items-center gap-2 bg-surface-border/50 rounded-lg px-2.5 py-1.5">
          <p className="text-[10px] text-slate-500 flex-shrink-0">Team ID:</p>
          <p className="text-[10px] font-mono text-slate-300 flex-1 truncate select-all">{team.id}</p>
          <button
            onClick={handleCopyId}
            className="flex-shrink-0 text-[10px] font-semibold text-primary-400 hover:text-primary-300 transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Share bookmarks */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        <p className="text-xs text-slate-500 font-medium mb-1.5">Your bookmarks — tap to share</p>
        {bookmarks.length === 0 && (
          <div className="text-center py-8 text-slate-600 text-xs">No bookmarks to share yet.</div>
        )}
        {bookmarks.slice(0, 20).map((bm) => {
          const isShared = team.sharedBookmarks.includes(bm.id)
          return (
            <div
              key={bm.id}
              className={`glass-card p-2.5 flex items-center gap-2.5 transition-all duration-150 ${
                isShared ? 'border-primary-500/30' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{bm.title}</p>
                <p className="text-[10px] text-slate-500 truncate">{bm.note || bm.url}</p>
              </div>
              <button
                onClick={() => handleShareBookmark(bm)}
                className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all duration-150 ${
                  isShared
                    ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                    : 'border-surface-border text-slate-500 hover:border-primary-500/40 hover:text-primary-400'
                }`}
              >
                {isShared ? '✓ Shared' : 'Share'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
