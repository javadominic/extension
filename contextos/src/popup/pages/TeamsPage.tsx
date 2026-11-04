import { useState, useEffect } from 'react'
import Toast from '../../components/Toast'
import { getSettings, saveSettings, getCachedBookmarks } from '../../lib/storage'
import type { BrainBookmark, AppSettings, TeamData } from '../../types'
import {
  IconUsers,
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconCopy,
  IconCheck,
} from '../../components/LucideIcons'

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
  const [members,      setMembers]      = useState<any[]>([])
  const [loadingMembers,setLoadingMembers]= useState(false)
  const [toast,        setToast]        = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [copied,       setCopied]       = useState(false)
  const [view,         setView]         = useState<'list' | 'detail' | 'add'>('list')
  const [detailTab,    setDetailTab]    = useState<'shared' | 'share' | 'members'>('shared')

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
    setMembers([])
    setLoadingShared(true)
    setLoadingMembers(true)
    
    if (settings) {
      const counts = settings.lastSeenSharedCount || {}
      if (counts[t.id] !== t.sharedBookmarks.length) {
        const newSettings = { ...settings, lastSeenSharedCount: { ...counts, [t.id]: t.sharedBookmarks.length } }
        setSettings(newSettings)
        saveSettings(newSettings).catch(() => {})
      }
    }

    try {
      const [sharedRes, membersRes] = await Promise.all([
        chrome.runtime.sendMessage({ type: 'GET_SHARED_BOOKMARKS', payload: { teamId: t.id } }),
        chrome.runtime.sendMessage({ type: 'GET_TEAM_MEMBERS', payload: { memberIds: t.members } }),
      ])
      if (sharedRes?.success) setSharedBms(sharedRes.data ?? [])
      if (membersRes?.success) setMembers(membersRes.data ?? [])
    } catch {}
    setLoadingShared(false)
    setLoadingMembers(false)
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
      setToast({ msg: 'Team created', type: 'success' })
    } catch (err) {
      setToast({ msg: `Error: ${(err as Error).message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleJoinTeam() {
    if (!joinCode.trim() || !settings?.firebaseUid) return
    const alreadyIn = (settings.teamIds ?? []).includes(joinCode.trim())
    if (alreadyIn) { setToast({ msg: 'Already a member of this team', type: 'error' }); return }
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
      setToast({ msg: 'Joined team', type: 'success' })
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

  async function handleUnshare(bookmarkId: string) {
    if (!activeTeam) return
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'UNSHARE_BOOKMARK',
        payload: { bookmarkId, teamId: activeTeam.id }
      })
      if (!res?.success) throw new Error(res?.error || 'Unknown error')
      setSharedBms(prev => prev.filter(b => b.id !== bookmarkId))
      setActiveTeam(prev => prev ? { ...prev, sharedBookmarks: prev.sharedBookmarks.filter(id => id !== bookmarkId) } : prev)
      setTeams(prev => prev.map(t =>
        t.id === activeTeam.id ? { ...t, sharedBookmarks: t.sharedBookmarks.filter(id => id !== bookmarkId) } : t
      ))
      setToast({ msg: 'Bookmark unshared.', type: 'success' })
    } catch (err) {
      setToast({ msg: `Error: ${(err as Error).message}`, type: 'error' })
    }
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

  async function handleRemoveMember(memberId: string) {
    if (!activeTeam || !settings?.firebaseUid) return
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'REMOVE_TEAM_MEMBER',
        payload: { teamId: activeTeam.id, memberId, requesterId: settings.firebaseUid }
      })
      if (!res?.success) throw new Error(res?.error || 'Unknown error')
      setMembers(prev => prev.filter(m => m.uid !== memberId))
      setActiveTeam(prev => prev ? { ...prev, members: prev.members.filter(id => id !== memberId) } : prev)
      setTeams(prev => prev.map(t =>
        t.id === activeTeam.id ? { ...t, members: t.members.filter(id => id !== memberId) } : t
      ))
      setToast({ msg: 'Member removed.', type: 'success' })
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
      <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-3 py-12">
        <div className="w-12 h-12 rounded-full bg-surface-raised border border-border flex items-center justify-center text-text-muted">
          <IconUsers size={22} strokeWidth={1.5} />
        </div>
        <p className="text-text font-medium text-sm">Sign in to collaborate</p>
        <p className="text-text-muted text-xs leading-relaxed max-w-xs">
          Open Settings and connect with Google to create teams and share bookmark collections.
        </p>
      </div>
    )
  }

  // ─── Team detail view ─────────────────────────────────────────────────────────
  if (view === 'detail' && activeTeam) {
    return (
      <div className="flex flex-col h-full">
        {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}

        {/* Header */}
        <div className="px-3 pt-3 pb-2 border-b border-border space-y-2.5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setView('list'); setActiveTeam(null) }}
              className="flex items-center gap-1 text-xs text-text-secondary hover:text-text cursor-pointer transition-colors"
            >
              <IconChevronLeft size={14} strokeWidth={1.5} />
              <span>Back</span>
            </button>
            <button
              onClick={() => handleLeaveTeam(activeTeam.id)}
              className="text-xs text-dead hover:underline cursor-pointer font-medium"
            >
              Leave team
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-btn bg-surface-raised border border-border flex items-center justify-center text-amber flex-shrink-0">
              <IconUsers size={16} strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-text text-sm truncate">{activeTeam.name}</p>
              <p className="text-[11px] text-text-muted">{activeTeam.members.length} member{activeTeam.members.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-surface-raised border border-border rounded-btn px-2.5 py-1.5">
            <span className="text-[11px] text-text-muted flex-shrink-0">Team ID:</span>
            <span className="text-[11px] font-mono text-text flex-1 truncate select-all">{activeTeam.id}</span>
            <button
              onClick={handleCopyId}
              className="flex-shrink-0 text-xs font-medium text-amber-text hover:underline cursor-pointer flex items-center gap-1"
            >
              {copied ? <IconCheck size={12} className="text-live" strokeWidth={2} /> : <IconCopy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-0.5 rounded-btn bg-surface-raised border border-border">
            {(['shared', 'members', 'share'] as const).map(tab => {
              const isActive = detailTab === tab
              const label = tab === 'shared' ? `Shared (${sharedBms.length})` : tab === 'members' ? `Members (${activeTeam.members.length})` : 'Share save'
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setDetailTab(tab)
                    if (tab === 'shared' && activeTeam && settings) {
                      const counts = settings.lastSeenSharedCount || {}
                      if (counts[activeTeam.id] !== activeTeam.sharedBookmarks.length) {
                        const newSettings = { ...settings, lastSeenSharedCount: { ...counts, [activeTeam.id]: activeTeam.sharedBookmarks.length } }
                        setSettings(newSettings)
                        saveSettings(newSettings).catch(() => {})
                      }
                    }
                  }}
                  className={`flex-1 text-xs py-1 rounded font-medium transition-colors duration-fast cursor-pointer ${
                    isActive
                      ? 'bg-amber text-[#1A1405] font-semibold'
                      : 'text-text-secondary hover:text-text'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2">
          {detailTab === 'shared' && (
            <>
              {loadingShared && <p className="text-xs text-text-muted text-center py-8">Loading shared bookmarks…</p>}
              {!loadingShared && sharedBms.length === 0 && (
                <div className="text-center py-10 text-text-muted text-xs leading-relaxed">
                  No bookmarks shared with this team yet.
                </div>
              )}
              {sharedBms.map((bm: any) => {
                const sharedByMember = members.find((m: any) => m.uid === bm.addedBy)
                const sharedByName = bm.addedBy === settings?.firebaseUid
                  ? 'You'
                  : sharedByMember?.displayName || sharedByMember?.email || (bm.addedBy ? `${bm.addedBy.slice(0, 8)}…` : null)
                return (
                  <div key={bm.id} className="surface-card p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text truncate">{bm.title}</p>
                        <p className="text-[11px] text-text-muted truncate">{bm.note || bm.url}</p>
                        <a
                          href={bm.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-amber-text hover:underline truncate block mt-0.5 font-mono"
                        >
                          {bm.url}
                        </a>
                        {sharedByName && (
                          <p className="text-[10px] text-text-muted mt-1">
                            Shared by <span className="text-text font-medium">{sharedByName}</span>
                          </p>
                        )}
                      </div>
                      {bm.addedBy === settings?.firebaseUid && (
                        <button
                          onClick={() => handleUnshare(bm.id)}
                          className="text-[11px] text-text-muted hover:text-danger cursor-pointer flex-shrink-0"
                        >
                          Unshare
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {detailTab === 'share' && (
            <>
              <p className="text-xs text-text-muted font-medium mb-1">Select a save to share</p>
              {bookmarks.length === 0 && (
                <div className="text-center py-10 text-text-muted text-xs">No saves available to share.</div>
              )}
              {bookmarks.slice(0, 20).map((bm) => {
                const isShared = activeTeam.sharedBookmarks.includes(bm.id)
                return (
                  <div
                    key={bm.id}
                    className={`surface-card p-2.5 flex items-center gap-2.5 transition-colors duration-fast ${
                      isShared ? 'border-amber/40 bg-amber-soft' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text truncate">{bm.title}</p>
                      <p className="text-[11px] text-text-muted truncate">{bm.note || bm.url}</p>
                    </div>
                    <button
                      onClick={() => handleShareBookmark(bm)}
                      className={`chip-neutral text-xs flex-shrink-0 cursor-pointer ${
                        isShared ? 'chip-selected' : ''
                      }`}
                    >
                      {isShared ? 'Shared' : 'Share'}
                    </button>
                  </div>
                )
              })}
            </>
          )}

          {detailTab === 'members' && (
            <>
              {loadingMembers && <p className="text-xs text-text-muted text-center py-8">Loading members…</p>}
              {!loadingMembers && members.map((m: any) => {
                const isYou = m.uid === settings?.firebaseUid
                const isCreator = activeTeam.createdBy === m.uid || activeTeam.members[0] === m.uid
                const iAmOwner = activeTeam.createdBy === settings?.firebaseUid || activeTeam.members[0] === settings?.firebaseUid
                return (
                  <div key={m.uid} className="surface-card p-2.5 flex items-center gap-2.5">
                    {m.photoURL ? (
                      <img src={m.photoURL} className="w-7 h-7 rounded-full flex-shrink-0" alt="" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-surface-raised border border-border flex items-center justify-center text-[10px] font-mono text-text flex-shrink-0">
                        {m.uid.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-mono text-text truncate">
                          {m.uid.slice(0, 16)}…
                        </p>
                        {isYou && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-raised border border-border text-text-secondary">
                            You
                          </span>
                        )}
                        {isCreator && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-soft border border-amber/30 text-amber-text">
                            Owner
                          </span>
                        )}
                      </div>
                      {(m.displayName || m.email) && (
                        <p className="text-[11px] text-text-muted truncate">{m.displayName || m.email}</p>
                      )}
                    </div>
                    {iAmOwner && !isYou && !isCreator && (
                      <button
                        onClick={() => handleRemoveMember(m.uid)}
                        className="text-[11px] text-text-muted hover:text-danger cursor-pointer flex-shrink-0"
                      >
                        Remove
                      </button>
                    )}
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
      <div className="flex flex-col h-full px-3 pt-3 pb-3 gap-3">
        {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}

        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-text cursor-pointer transition-colors"
          >
            <IconChevronLeft size={14} strokeWidth={1.5} />
            <span>Back</span>
          </button>
          <span className="text-text font-medium text-sm">Add a team</span>
        </div>

        <div className="surface-card p-3.5 space-y-2.5">
          <p className="text-xs font-medium text-text">Create a team</p>
          <input
            className="input-field"
            placeholder="Team name"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
          />
          <button
            onClick={handleCreateTeam}
            disabled={loading || !teamName.trim()}
            className="btn-primary w-full text-xs"
          >
            {loading ? 'Creating…' : 'Create team'}
          </button>
        </div>

        <div className="flex items-center gap-2 my-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-text-muted">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="surface-card p-3.5 space-y-2.5">
          <p className="text-xs font-medium text-text">Join by team ID</p>
          <input
            className="input-field font-mono text-xs"
            placeholder="Paste team ID"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
          />
          <button
            onClick={handleJoinTeam}
            disabled={loading || !joinCode.trim()}
            className="btn-secondary w-full text-xs"
          >
            {loading ? 'Joining…' : 'Join team'}
          </button>
        </div>
      </div>
    )
  }

  // ─── Teams list view ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}

      <div className="px-3 pt-3 pb-2 border-b border-border flex items-center justify-between">
        <p className="text-text font-medium text-sm">Teams</p>
        <button
          onClick={() => setView('add')}
          className="btn-secondary text-xs py-1 px-2.5 min-h-[30px]"
        >
          <IconPlus size={13} strokeWidth={2} />
          <span>Add team</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2">
        {teams.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2.5 text-center px-6 py-12">
            <div className="w-10 h-10 rounded-full bg-surface-raised border border-border flex items-center justify-center text-text-muted mb-2">
              <IconUsers size={18} strokeWidth={1.5} />
            </div>
            <p className="text-text font-medium text-sm">No teams joined</p>
            <p className="text-text-muted text-xs leading-relaxed max-w-xs">
              Create a team or join using an invite code to share and curate saves with others.
            </p>
          </div>
        )}
        {teams.map(t => {
          const newCount = t.sharedBookmarks.length - (settings?.lastSeenSharedCount?.[t.id] || 0)
          return (
            <button
              key={t.id}
              onClick={() => openTeam(t)}
              className="surface-card p-3 w-full flex items-center gap-3 text-left hover:border-border-control transition-colors duration-fast cursor-pointer"
            >
              <div className="w-8 h-8 rounded-btn bg-surface-raised border border-border flex items-center justify-center text-text flex-shrink-0 relative">
                <IconUsers size={16} strokeWidth={1.5} />
                {newCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-dead text-white text-[9px] font-medium w-4 h-4 rounded-full flex items-center justify-center">
                    {newCount > 9 ? '9+' : newCount}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-text text-sm truncate">{t.name}</p>
                  {newCount > 0 && (
                    <span className="bg-amber-soft text-amber-text border border-amber/30 text-[10px] font-medium px-1.5 py-0.2 rounded">
                      {newCount} new
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted">
                  {t.members.length} member{t.members.length !== 1 ? 's' : ''} · {t.sharedBookmarks.length} shared
                </p>
              </div>
              <IconChevronRight size={14} className="text-text-muted" strokeWidth={1.5} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
