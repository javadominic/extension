import { useState, useEffect, useMemo, useCallback } from 'react'
import BookmarkCard from '../../components/BookmarkCard'
import AddNoteModal from '../../components/AddNoteModal'
import TagBadge     from '../../components/TagBadge'
import Toast        from '../../components/Toast'
import SiteChainCard from '../../components/SiteChainCard'
import AddToChainModal from '../../components/AddToChainModal'
import { getCachedBookmarks, getSettings } from '../../lib/storage'
import { syncChromeBookmarks, updateNote, deleteBookmark } from '../../lib/bookmarks'
import { groupBookmarksBySite, unlinkBookmark, type SiteGroup } from '../../lib/chains'
import type { BrainBookmark } from '../../types'
import {
  IconLink2,
  IconList,
  IconRefreshCw,
  IconPlus,
  IconX,
  IconBookmark,
} from '../../components/LucideIcons'

type HealthFilter = 'all' | 'alive' | 'dead' | 'unchecked'
type SortOrder    = 'newest' | 'oldest' | 'az'

const HEALTH_FILTERS: { id: HealthFilter; label: string; dot: string }[] = [
  { id: 'all',       label: 'All',       dot: 'bg-text-secondary' },
  { id: 'alive',     label: 'Live',      dot: 'bg-live' },
  { id: 'dead',      label: 'Dead',      dot: 'bg-dead' },
  { id: 'unchecked', label: 'Unchecked', dot: 'bg-text-muted' },
]

function SkeletonCard() {
  return (
    <div className="surface-card p-3.5 space-y-2">
      <div className="flex items-start gap-2.5">
        <div className="w-4 h-4 rounded bg-surface-raised flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-surface-raised rounded w-3/4" />
          <div className="h-2.5 bg-surface-raised rounded w-1/3" />
        </div>
      </div>
      <div className="h-2 bg-surface-raised rounded w-5/6 ml-6" />
      <div className="flex gap-1.5 ml-6">
        {[40, 52, 36].map(w => (
          <div key={w} className="h-4 bg-surface-raised rounded" style={{ width: `${w}px` }} />
        ))}
      </div>
    </div>
  )
}

interface UndoState {
  bookmark: BrainBookmark
  timerId: ReturnType<typeof setTimeout>
}

export default function BookmarksPage() {
  const [bookmarks,    setBookmarks]    = useState<BrainBookmark[]>([])
  const [loading,      setLoading]      = useState(true)
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all')
  const [activeTag,    setActiveTag]    = useState<string | null>(null)
  const [filterText,   setFilterText]   = useState('')
  const [sortOrder,    setSortOrder]    = useState<SortOrder>('newest')
  const [editing,      setEditing]      = useState<BrainBookmark | null>(null)
  const [syncing,      setSyncing]      = useState(false)
  const [toast,        setToast]        = useState<{ msg: string; type: 'success' | 'error'; onUndo?: () => void } | null>(null)
  const [aiProgress,   setAiProgress]   = useState<{ current: number; total: number; done?: boolean } | null>(null)
  const [pendingEditId, setPendingEditId] = useState<string | null>(null)
  const [bulkMode,     setBulkMode]     = useState(false)
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set())
  const [undoState,    setUndoState]    = useState<UndoState | null>(null)
  const [groupBySite,  setGroupBySite]  = useState(false)
  const [chainModalGroup, setChainModalGroup] = useState<SiteGroup | null>(null)

  useEffect(() => {
    import('../../lib/storage').then(({ getCachedBookmarks }) => {
      getCachedBookmarks().then(bms => {
        const seen = new Set<string>()
        const deduped = bms.filter(b => {
          if (!b.url || seen.has(b.url)) return false
          seen.add(b.url)
          return true
        })
        setBookmarks(deduped)
        setLoading(false)
      })
    })

    import('../../lib/storage').then(({ getAndClearPendingEdit }) => {
      getAndClearPendingEdit().then(id => { if (id) setPendingEditId(id) })
    })

    function onStorageChange(changes: Record<string, chrome.storage.StorageChange>, area: string) {
      if (area === 'local' && changes.pending_edit?.newValue) {
        setPendingEditId(changes.pending_edit.newValue as string)
        chrome.storage.local.remove('pending_edit')
      }
    }
    chrome.storage.onChanged.addListener(onStorageChange)
    return () => chrome.storage.onChanged.removeListener(onStorageChange)
  }, [])

  useEffect(() => {
    if (pendingEditId && bookmarks.length > 0) {
      const bm = bookmarks.find(b => b.id === pendingEditId)
      if (bm) { setEditing(bm); setPendingEditId(null) }
    }
  }, [pendingEditId, bookmarks])

  useEffect(() => {
    function onMessage(msg: any) {
      if (msg.type === 'AI_SYNC_PROGRESS') {
        const { current, total, bookmark, done } = msg.payload
        if (done) { setAiProgress(null); return }
        setAiProgress({ current, total })
        if (bookmark) setBookmarks(prev => prev.map(b => b.id === bookmark.id ? bookmark : b))
      }
      if (msg.type === 'AI_SYNC_RATE_LIMITED') {
        const { retryAfter, remaining } = msg.payload
        setAiProgress(null)
        setToast({
          msg: `Gemini rate limit: ${remaining} bookmark${remaining !== 1 ? 's' : ''} pending. Resuming in ${retryAfter}s.`,
          type: 'error',
        })
      }
    }
    chrome.runtime.onMessage.addListener(onMessage)
    return () => chrome.runtime.onMessage.removeListener(onMessage)
  }, [])

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    bookmarks.forEach(b => b.tags.forEach(t => tagSet.add(t)))
    return Array.from(tagSet).slice(0, 20)
  }, [bookmarks])

  const filtered = useMemo(() => {
    let list = bookmarks
    if (healthFilter !== 'all') list = list.filter(b => b.health === healthFilter)
    if (activeTag)              list = list.filter(b => b.tags.includes(activeTag!))
    if (filterText.trim()) {
      const q = filterText.toLowerCase()
      list = list.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        b.note?.toLowerCase().includes(q) ||
        b.tags.some(t => t.includes(q))
      )
    }
    const sorted = [...list]
    if      (sortOrder === 'newest') sorted.sort((a, b) => b.addedAt - a.addedAt)
    else if (sortOrder === 'oldest') sorted.sort((a, b) => a.addedAt - b.addedAt)
    else if (sortOrder === 'az')     sorted.sort((a, b) => a.title.localeCompare(b.title))
    return sorted
  }, [bookmarks, healthFilter, activeTag, filterText, sortOrder])

  async function handleSync() {
    setSyncing(true)
    try {
      const settings = await getSettings()
      const synced = await syncChromeBookmarks(settings.firebaseUid ?? '')
      setBookmarks(synced)
      const missingNotes = synced.filter(b => !b.note)
      if (missingNotes.length > 0 && settings.geminiApiKey) {
        chrome.runtime.sendMessage({ type: 'START_AI_SYNC', payload: { bookmarks: missingNotes } })
      }
      setToast({ msg: `Synced ${synced.length} bookmarks`, type: 'success' })
    } catch (err) {
      setToast({ msg: `Sync failed: ${(err as Error).message}`, type: 'error' })
    } finally {
      setSyncing(false)
    }
  }

  async function handleSaveNote(note: string, tags: string[]) {
    if (!editing) return
    const settings = await getSettings()
    await updateNote(editing.id, note, tags, settings.firebaseUid ?? '')
    setBookmarks(prev => prev.map(b => b.id === editing.id ? { ...b, note, tags } : b))
    setEditing(null)
    setToast({ msg: 'Note saved', type: 'success' })
  }

  const handleDelete = useCallback(async (id: string) => {
    const bm = bookmarks.find(b => b.id === id)
    if (!bm) return

    setBookmarks(prev => prev.filter(b => b.id !== id))
    setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s })

    if (undoState) clearTimeout(undoState.timerId)

    const timerId = setTimeout(async () => {
      const settings = await getSettings()
      await deleteBookmark(id, settings.firebaseUid ?? '')
      setUndoState(null)
    }, 5000)

    setUndoState({ bookmark: bm, timerId })
    setToast({
      msg: 'Bookmark deleted',
      type: 'success',
      onUndo: () => {
        clearTimeout(timerId)
        setUndoState(null)
        setBookmarks(prev => {
          const updated = [...prev, bm]
          updated.sort((a, b) => b.addedAt - a.addedAt)
          return updated
        })
        setToast({ msg: 'Bookmark restored', type: 'success' })
      },
    })
  }, [bookmarks, undoState])

  async function handleSaveCurrentPage() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const activeTab = tabs[0]
    if (!activeTab?.url || !activeTab.title) return
    chrome.bookmarks.create({ title: activeTab.title, url: activeTab.url }, async node => {
      const settings = await getSettings()
      const newBm: BrainBookmark = {
        id: node.id, url: node.url!, title: node.title,
        note: '', tags: [], addedAt: node.dateAdded ?? Date.now(),
        health: 'unchecked', source: 'chrome', uid: settings.firebaseUid ?? '',
      }
      setBookmarks(prev => [newBm, ...prev])
      setEditing(newBm)
    })
  }

  function handleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(b => b.id)))
    }
  }

  function handleSelectAllDead() {
    const deadIds = filtered.filter(b => b.health === 'dead').map(b => b.id)
    setSelectedIds(new Set(deadIds))
  }

  async function handleDeleteSelected() {
    const ids = Array.from(selectedIds)
    for (const id of ids) await handleDelete(id)
    setBulkMode(false)
    setSelectedIds(new Set())
  }

  async function handleRecheckSelected() {
    const ids = Array.from(selectedIds)
    setToast({ msg: `Re-checking ${ids.length} links…`, type: 'info' as 'success' })
    for (const id of ids) {
      const bm = bookmarks.find(b => b.id === id)
      if (!bm) continue
      chrome.runtime.sendMessage({ type: 'CHECK_HEALTH', payload: { url: bm.url } }, res => {
        if (res?.success) {
          setBookmarks(prev => prev.map(b => b.id === id ? { ...b, health: res.data as BrainBookmark['health'] } : b))
        }
      })
    }
    setBulkMode(false)
    setSelectedIds(new Set())
  }

  function handleSelect(id: string, checked: boolean) {
    setSelectedIds(prev => {
      const s = new Set(prev)
      checked ? s.add(id) : s.delete(id)
      return s
    })
  }

  const siteGroups = useMemo(() => groupBookmarksBySite(filtered), [filtered])

  const handleOpenAllInGroup = useCallback((group: SiteGroup) => {
    for (const b of group.bookmarks) {
      chrome.tabs.create({ url: b.url })
    }
  }, [])

  const handleUnlink = useCallback(async (bookmarkId: string) => {
    const s = await getSettings()
    await unlinkBookmark(bookmarkId, s.firebaseUid)
    setBookmarks(prev => prev.map(b => b.id === bookmarkId ? { ...b, parentId: null } : b))
    setToast({ msg: 'Page unlinked from chain.', type: 'success' })
  }, [])

  const handleShowInGraph = useCallback((group: SiteGroup) => {
    window.dispatchEvent(new CustomEvent('SWITCH_TAB', { detail: { tab: 'graph', domainKey: group.domainKey } }))
  }, [])

  return (
    <div className="flex flex-col h-full">
      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onDismiss={() => setToast(null)}
          onUndo={toast.onUndo}
        />
      )}

      <div className="px-3 pt-3 pb-2 border-b border-border space-y-2">
        {aiProgress && (
          <div className="flex items-center justify-between bg-surface-raised border border-border rounded-btn px-3 py-1.5 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-amber border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-text-secondary font-medium tracking-tight">Generating notes…</span>
            </div>
            <span className="text-xs font-mono text-amber-text">
              {aiProgress.current} / {aiProgress.total}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted font-medium">{bookmarks.length} saves</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSaveCurrentPage}
              className="btn-primary text-xs py-1 px-2.5 min-h-[30px]"
            >
              <IconPlus size={13} strokeWidth={2} />
              <span>Save</span>
            </button>

            <button
              id="group-by-site-btn"
              onClick={() => setGroupBySite(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-medium py-1 px-2 rounded-btn border min-h-[30px] cursor-pointer transition-colors duration-fast ${
                groupBySite
                  ? 'bg-amber-soft border-amber text-amber-text'
                  : 'bg-surface-raised border-border text-text-secondary hover:text-text hover:border-border-control'
              }`}
              title={groupBySite ? 'Show flat list' : 'Group by domain'}
            >
              <IconLink2 size={13} strokeWidth={1.5} />
              <span>{groupBySite ? 'Grouped' : 'Group'}</span>
            </button>

            <button
              id="bulk-mode-btn"
              onClick={() => { setBulkMode(v => !v); setSelectedIds(new Set()) }}
              className={`flex items-center justify-center w-8 h-8 rounded-btn border transition-colors duration-fast cursor-pointer ${
                bulkMode
                  ? 'bg-amber-soft border-amber text-amber-text'
                  : 'bg-surface-raised border-border text-text-secondary hover:text-text hover:border-border-control'
              }`}
              title="Bulk selection"
            >
              <IconList size={14} strokeWidth={1.5} />
            </button>

            <button
              id="sync-btn"
              onClick={handleSync}
              disabled={syncing}
              className="btn-ghost flex items-center justify-center w-8 h-8 p-0 cursor-pointer"
              title={syncing ? 'Syncing…' : 'Sync browser bookmarks'}
            >
              {syncing ? (
                <span className="w-3.5 h-3.5 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
              ) : (
                <IconRefreshCw size={14} strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>

        {bulkMode && selectedIds.size > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-text-muted font-medium">{selectedIds.size} selected</span>
            <button onClick={handleSelectAll} className="chip-neutral text-[11px]">
              {selectedIds.size === filtered.length ? 'Deselect all' : 'Select all'}
            </button>
            <button onClick={handleSelectAllDead} className="chip-neutral text-[11px] text-dead hover:text-dead">
              All dead
            </button>
            <button onClick={handleRecheckSelected} className="chip-neutral text-[11px]">
              Re-check
            </button>
            <button onClick={handleDeleteSelected} className="chip-neutral text-[11px] text-dead hover:text-dead ml-auto">
              Delete ({selectedIds.size})
            </button>
          </div>
        )}
        {bulkMode && selectedIds.size === 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-text-muted">Select bookmarks below</span>
            <button onClick={handleSelectAll} className="chip-neutral text-[11px]">
              Select all
            </button>
            <button onClick={handleSelectAllDead} className="chip-neutral text-[11px] text-dead hover:text-dead">
              All dead
            </button>
          </div>
        )}

        <div className="relative">
          <input
            id="filter-bookmarks-input"
            type="text"
            placeholder="Filter saves…"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            className="input-field text-xs pr-8 py-1.5 min-h-[32px]"
          />
          {filterText && (
            <button
              onClick={() => setFilterText('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors p-1"
            >
              <IconX size={13} strokeWidth={1.5} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 overflow-x-auto pb-0 no-scrollbar flex-1">
            {HEALTH_FILTERS.map(f => (
              <button
                key={f.id}
                id={`filter-${f.id}`}
                onClick={() => setHealthFilter(f.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-btn border transition-colors duration-fast cursor-pointer ${
                  healthFilter === f.id
                    ? 'bg-amber-soft border-amber text-amber-text'
                    : 'bg-surface border-border text-text-secondary hover:text-text hover:border-border-control'
                }`}
              >
                {f.id !== 'all' && (
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${f.dot}`} />
                )}
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          <select
            id="sort-select"
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as SortOrder)}
            className="flex-shrink-0 text-xs bg-surface border border-border text-text-secondary rounded-btn px-2 py-1 focus:outline-none focus:border-amber transition-colors cursor-pointer"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="az">A–Z</option>
          </select>
        </div>

        {allTags.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
            {allTags.map(tag => (
              <TagBadge
                key={tag}
                tag={tag}
                active={activeTag === tag}
                onClick={() => setActiveTag(prev => prev === tag ? null : tag)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="w-10 h-10 rounded-full bg-surface-raised border border-border flex items-center justify-center text-text-muted mb-3">
              <IconBookmark size={18} strokeWidth={1.5} />
            </div>
            <p className="text-text font-medium text-sm mb-1">
              {bookmarks.length === 0 ? 'No bookmarks saved' : 'No matches'}
            </p>
            <p className="text-text-muted text-xs leading-relaxed max-w-xs">
              {bookmarks.length === 0
                ? 'Sync your browser bookmarks to build your archive, or save pages as you browse.'
                : 'Try adjusting your search filter or health selection.'}
            </p>
            {bookmarks.length === 0 && (
              <button onClick={handleSync} className="btn-secondary mt-4 text-xs">
                Sync bookmarks
              </button>
            )}
          </div>
        ) : groupBySite ? (
          siteGroups.map(group => (
            <SiteChainCard
              key={group.domainKey}
              group={group}
              onOpenAll={handleOpenAllInGroup}
              onAddToChain={() => setChainModalGroup(group)}
              onUnlink={handleUnlink}
              onShowInGraph={handleShowInGraph}
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          ))
        ) : (
          filtered.map(bm => (
            <BookmarkCard
              key={bm.id}
              bookmark={bm}
              onEdit={setEditing}
              onDelete={handleDelete}
              selected={selectedIds.has(bm.id)}
              onSelect={handleSelect}
              bulkMode={bulkMode}
            />
          ))
        )}
      </div>

      {chainModalGroup && (
        <AddToChainModal
          group={chainModalGroup}
          allBookmarks={bookmarks}
          onClose={() => setChainModalGroup(null)}
          onSuccess={msg => {
            setToast({ msg, type: 'success' })
            import('../../lib/storage').then(({ getCachedBookmarks }) => {
              getCachedBookmarks().then(setBookmarks)
            })
          }}
        />
      )}

      {editing && (
        <AddNoteModal
          bookmark={editing}
          onSave={handleSaveNote}
          onSkip={() => setEditing(null)}
        />
      )}
    </div>
  )
}
