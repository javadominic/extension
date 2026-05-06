import { useState, useEffect } from 'react'
import Toast from '../../components/Toast'
import { getSettings, saveSettings, getCachedBookmarks } from '../../lib/storage'
import type { BrainBookmark, AppSettings, TeamData } from '../../types'

export default function TeamsPage() {
  const [settings,     setSettings]     = useState<AppSettings | null>(null)
  const [teams,        setTeams]        = useState<TeamData[]>([])
  const [activeTeam,   setActiveTeam]   = useState<TeamData | null>(null)
  const [teamName,     setTeamName]     = useState('')
  const [joinCode,     setJoinCode]     = useState('')
  const [loading,      setLoading]      = useState(false)
  const [bookmarks,    setBookmarks]    = useState<BrainBookmark[]>([])
  const [sharedBms,    setSharedBms]    = useState<any[]>([])
  const [loadingShared,setLoadingShared]= useState(false)
  const [toast,        setToast]        = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [copied,       setCopied]       = useState(false)
  const [view,         setView]         = useState<'list' | 'detail' | 'add'>('list')
  const [detailTab,    setDetailTab]    = useState<'share' | 'shared'>('shared')

  useEffect(() => {
    async function load() {
      const s = await getSettings()
      setSettings(s)
      const bms = await getCachedBookmarks()
      setBookmarks(bms)
      const ids = s.teamIds ?? (s.teamId ? [s.teamId] : [])
      if (ids.length > 0) {
        const loaded: TeamData[] = []
        for (const id of ids) {
          try {
            const res = await chrome.runtime.sendMessage({ type: 'GET_TEAM', payload: { teamId: id } })
            if (res?.success && res.data) loaded.push(res.data as TeamData)
          } catch {}
        }
        setTeams(loaded)
      }
    }
    load()
  }, [])

  async function openTeam(t: TeamData) {
    setActiveTeam(t)
    setView('detail')
    setDetailTab('shared')
    setSharedBms([])
    setLoadingShared(true)
    try {
      const res = await chrome.runtime.sendMessage({ type: 'GET_SHARED_BOOKMARKS', payload: { teamId: t.id } })
      if (res?.success) setSharedBms(res.data ?? [])
    } catch {}
    setLoadingShared(false)
  }

  async function handleCreateTeam() {
    if (!teamName.trim() || !settings?.firebaseUid) return
    setLoading(true)
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'CREATE_TEAM',
        payload: { teamName: teamName.trim(), uid: settings.firebaseUid }
      })
      if (!res?.success) throw new Error(res?.error || 'Unknown error')
      const newTeam: TeamData = {
        id: res.data,
        name: teamName.trim(),
        members: [settings.firebaseUid],
        sharedBookmarks: [],
      }
      const newIds = [...(settings.teamIds ?? (settings.teamId ? [settings.teamId] : [])), res.data]
      const newSettings = { ...settings, teamIds: newIds, teamId: newIds[0] }
      await saveSettings(newSettings)
      setSettings(newSettings)
      setTeams(prev => [...prev, newTeam])
      setTeamName('')
      await openTeam(newTeam)
      setToast({ msg: 'Team created!', type: 'success' })
    } catch (err) {
      setToast({ msg: `Error: ${(err as Error).message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleJoinTeam() {
    if (!joinCode.trim() || !settings?.firebaseUid) return
    const alreadyIn = (settings.teamIds ?? []).includes(joinCode.trim())
    if (alreadyIn) { setToast({ msg: 'Already in this team!', type: 'error' }); return }
    setLoading(true)
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'JOIN_TEAM',
        payload: { joinCode: joinCode.trim(), uid: settings.firebaseUid }
      })
      if (!res?.success) throw new Error(res?.error || 'Unknown error')
      const newIds = [...(settings.teamIds ?? (settings.teamId ? [settings.teamId] : [])), joinCode.trim()]
      const newSettings = { ...settings, teamIds: newIds, teamId: newIds[0] }
      await saveSettings(newSettings)
      setSettings(newSettings)
      setTeams(prev => [...prev, res.data as TeamData])
      setJoinCode('')
      await openTeam(res.data as TeamData)
      setToast({ msg: 'Joined team!', type: 'success' })
    } catch (err) {
      setToast({ msg: `Error: ${(err as Error).message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleLeaveTeam(teamId: string) {
    if (!settings) return
    const newIds = (settings.teamIds ?? (settings.teamId ? [settings.teamId] : [])).filter(id => id !== teamId)
    const newSettings = { ...settings, teamIds: newIds, teamId: newIds[0] }
    await saveSettings(newSettings)
    setSettings(newSettings)
    setTeams(prev => prev.filter(t => t.id !== teamId))
    setActiveTeam(null)
    setSharedBms([])
    setView('list')
    setToast({ msg: 'Left team.', type: 'success' })
  }

  async function handleShareBookmark(bm: BrainBookmark) {
    if (!activeTeam || !settings?.firebaseUid) return
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'SHARE_BOOKMARK',
        payload: { bm, teamId: activeTeam.id, uid: settings.firebaseUid }
      })
      if (!res?.success) throw new Error(res?.error || 'Unknown error')
      // optimistically add to shared list
      setSharedBms(prev => [...prev.filter(b => b.id !== bm.id), { ...bm, addedBy: settings.firebaseUid, addedAt: Date.now() }])
      setTeams(prev => prev.map(t =>
        t.id === activeTeam.id ? { ...t, sharedBookmarks: [...t.sharedBookmarks, bm.id] } : t
      ))
      setActiveTeam(prev => prev ? { ...prev, sharedBookmarks: [...prev.sharedBookmarks, bm.id] } : prev)
      setToast({ msg: 'Shared with team!', type: 'success' })
    } catch (err) {
      setToast({ msg: `Error: ${(err as Error).message}`, type: 'error' })
    }
  }

  function handleCopyId() {
    if (!activeTeam?.id) return
    navigator.clipboard.writeText(activeTeam.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ─── Not signed in ───────────────────────────────────────────────────────────
  if (!settings?.firebaseUid) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-3">
        <span className="text-5xl">👥</span>
        <p className="text-slate-200 font-semibold text-sm">Sign in to use Teams</p>
        <p className="text-slate-500 text-xs">Go to Settings and sign in with Google to collaborate.</p>
      </div>
    )
  }

  // ─── Team detail view ─────────────────────────────────────────────────────────
  if (view === 'detail' && activeTeam) {
    return (
      <div className="flex flex-col h-full">
        {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}

        {/* Header */}
        <div className="px-3 pt-3 pb-2 border-b border-surface-border">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => { setView('list'); setActiveTeam(null) }}
              className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
              ← Back
            </button>
            <div className="flex-1" />
            <button onClick={() => handleLeaveTeam(activeTeam.id)}
              className="text-[10px] text-red-400 hover:text-red-300 border border-red-500/30 px-2 py-1 rounded-lg transition-all">
              Leave
            </button>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-base">👥</div>
            <div>
              <p className="font-bold text-slate-100 text-sm">{activeTeam.name}</p>
              <p className="text-xs text-slate-500">{activeTeam.members.length} member{activeTeam.members.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-surface-border/50 rounded-lg px-2.5 py-1.5 mb-2">
            <p className="text-[10px] text-slate-500 flex-shrink-0">Team ID:</p>
            <p className="text-[10px] font-mono text-slate-300 flex-1 truncate select-all">{activeTeam.id}</p>
            <button onClick={handleCopyId}
              className="flex-shrink-0 text-[10px] font-semibold text-primary-400 hover:text-primary-300 transition-colors">
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {(['shared', 'share'] as const).map(tab => (
              <button key={tab} onClick={() => setDetailTab(tab)}
                className={`flex-1 text-[11px] font-semibold py-1 rounded-lg transition-all ${
                  detailTab === tab
                    ? 'bg-primary-600/30 text-primary-300 border border-primary-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}>
                {tab === 'shared' ? `📥 Shared by Team (${sharedBms.length})` : '📤 Share Yours'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {detailTab === 'shared' && (
            <>
              {loadingShared && <p className="text-xs text-slate-500 text-center py-6">Loading shared bookmarks…</p>}
              {!loadingShared && sharedBms.length === 0 && (
                <div className="text-center py-8 text-slate-600 text-xs">No bookmarks shared yet.<br/>Be the first to share one!</div>
              )}
              {sharedBms.map((bm: any) => (
                <div key={bm.id} className="glass-card p-2.5">
                  <p className="text-xs font-semibold text-slate-200 truncate">{bm.title}</p>
                  <p className="text-[10px] text-slate-500 truncate mb-1">{bm.note || bm.url}</p>
                  <a href={bm.url} target="_blank" rel="noreferrer"
                    className="text-[10px] text-primary-400 hover:text-primary-300 truncate block">
                    {bm.url}
                  </a>
                </div>
              ))}
            </>
          )}

          {detailTab === 'share' && (
            <>
              <p className="text-xs text-slate-500 font-medium mb-1.5">Tap a bookmark to share it with the team</p>
              {bookmarks.length === 0 && (
                <div className="text-center py-8 text-slate-600 text-xs">No bookmarks to share yet.</div>
              )}
              {bookmarks.slice(0, 20).map((bm) => {
                const isShared = activeTeam.sharedBookmarks.includes(bm.id)
                return (
                  <div key={bm.id}
                    className={`glass-card p-2.5 flex items-center gap-2.5 transition-all duration-150 ${isShared ? 'border-primary-500/30' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">{bm.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{bm.note || bm.url}</p>
                    </div>
                    <button onClick={() => handleShareBookmark(bm)}
                      className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all duration-150 ${
                        isShared
                          ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                          : 'border-surface-border text-slate-500 hover:border-primary-500/40 hover:text-primary-400'
                      }`}>
                      {isShared ? '✓ Shared' : 'Share'}
                    </button>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    )
  }

  // ─── Add team view ────────────────────────────────────────────────────────────
  if (view === 'add') {
    return (
      <div className="flex flex-col h-full px-3 pt-4 pb-3 gap-4">
        {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}

        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
            ← Back
          </button>
          <p className="text-slate-200 font-bold text-sm">Add a Team</p>
        </div>

        <div className="glass-card p-3 space-y-2">
          <p className="text-xs font-semibold text-slate-400">Create a new team</p>
          <input className="input-field" placeholder="Team name…" value={teamName} onChange={e => setTeamName(e.target.value)} />
          <button onClick={handleCreateTeam} disabled={loading || !teamName.trim()} className="btn-primary w-full">
            {loading ? 'Creating…' : 'Create Team'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-surface-border" />
          <span className="text-xs text-slate-600">or</span>
          <div className="flex-1 h-px bg-surface-border" />
        </div>

        <div className="glass-card p-3 space-y-2">
          <p className="text-xs font-semibold text-slate-400">Join by team ID</p>
          <input className="input-field" placeholder="Paste Team ID…" value={joinCode} onChange={e => setJoinCode(e.target.value)} />
          <button onClick={handleJoinTeam} disabled={loading || !joinCode.trim()} className="btn-ghost w-full">
            {loading ? 'Joining…' : 'Join Team'}
          </button>
        </div>
      </div>
    )
  }

  // ─── Teams list view ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}

      <div className="px-3 pt-3 pb-2 border-b border-surface-border flex items-center justify-between">
        <p className="text-slate-200 font-bold text-sm">My Teams</p>
        <button onClick={() => setView('add')}
          className="text-[11px] font-semibold text-primary-400 hover:text-primary-300 border border-primary-500/30 hover:border-primary-400/50 px-2.5 py-1 rounded-lg transition-all">
          + Add Team
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {teams.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <span className="text-4xl">👥</span>
            <p className="text-slate-400 text-sm font-semibold">No teams yet</p>
            <p className="text-slate-600 text-xs">Tap "+ Add Team" to create or join one</p>
          </div>
        )}
        {teams.map(t => (
          <button key={t.id} onClick={() => openTeam(t)}
            className="glass-card p-3 w-full flex items-center gap-3 text-left hover:border-primary-500/30 transition-all">
            <div className="w-9 h-9 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-lg flex-shrink-0">👥</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-100 text-sm truncate">{t.name}</p>
              <p className="text-[10px] text-slate-500">{t.members.length} member{t.members.length !== 1 ? 's' : ''} · {t.sharedBookmarks.length} shared</p>
            </div>
            <span className="text-slate-600 text-xs">›</span>
          </button>
        ))}
      </div>
    </div>
  )
}
