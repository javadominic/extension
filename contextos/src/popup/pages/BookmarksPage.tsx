import { useState, useEffect, useMemo } from 'react'
import BookmarkCard from '../../components/BookmarkCard'
import AddNoteModal from '../../components/AddNoteModal'
import TagBadge     from '../../components/TagBadge'
import Toast        from '../../components/Toast'
import { getCachedBookmarks, getSettings } from '../../lib/storage'
import { syncChromeBookmarks, updateNote, deleteBookmark } from '../../lib/bookmarks'
import type { BrainBookmark } from '../../types'

type HealthFilter = 'all' | 'alive' | 'dead' | 'unchecked'

const HEALTH_FILTERS: { id: HealthFilter; label: string }[] = [
  { id: 'all',       label: 'All' },
  { id: 'alive',     label: '🟢 Live' },
  { id: 'dead',      label: '🔴 Dead' },
  { id: 'unchecked', label: '⚫ Unchecked' },
]

export default function BookmarksPage() {
  const [bookmarks,     setBookmarks]     = useState<BrainBookmark[]>([])
  const [healthFilter,  setHealthFilter]  = useState<HealthFilter>('all')
  const [activeTag,     setActiveTag]     = useState<string | null>(null)
  const [editing,       setEditing]       = useState<BrainBookmark | null>(null)
  const [syncing,       setSyncing]       = useState(false)
  const [toast,         setToast]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    import('../../lib/storage').then(({ getAndClearPendingEdit }) => {
      getCachedBookmarks().then(async (data) => {
        setBookmarks(data)
        const pendingId = await getAndClearPendingEdit()
        if (pendingId) {
          const bm = data.find((b) => b.id === pendingId)
          if (bm) setEditing(bm)
        }
      })
    })
  }, [])

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    bookmarks.forEach((b) => b.tags.forEach((t) => tagSet.add(t)))
    return Array.from(tagSet).slice(0, 20)
  }, [bookmarks])

  // Filtered list
  const filtered = useMemo(() => {
    let list = bookmarks
    if (healthFilter !== 'all') list = list.filter((b) => b.health === healthFilter)
    if (activeTag)              list = list.filter((b) => b.tags.includes(activeTag))
    return list
  }, [bookmarks, healthFilter, activeTag])

  async function handleSync() {
    setSyncing(true)
    try {
      const settings = await getSettings()
      const synced = await syncChromeBookmarks(settings.firebaseUid ?? '')
      setBookmarks(synced)
      setToast({ msg: `Synced ${synced.length} bookmarks!`, type: 'success' })
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
    setBookmarks((prev) =>
      prev.map((b) => b.id === editing.id ? { ...b, note, tags } : b)
    )
    setEditing(null)
    setToast({ msg: 'Note saved!', type: 'success' })
  }

  async function handleDelete(id: string) {
    const settings = await getSettings()
    await deleteBookmark(id, settings.firebaseUid ?? '')
    setBookmarks((prev) => prev.filter((b) => b.id !== id))
    setToast({ msg: 'Bookmark deleted.', type: 'success' })
  }

  async function handleSaveCurrentPage() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const activeTab = tabs[0]
    if (!activeTab || !activeTab.url || !activeTab.title) return

    chrome.bookmarks.create({ title: activeTab.title, url: activeTab.url }, async (node) => {
      const settings = await getSettings()
      const newBm: BrainBookmark = {
        id: node.id,
        url: node.url!,
        title: node.title,
        note: '',
        tags: [],
        addedAt: node.dateAdded ?? Date.now(),
        health: 'unchecked',
        source: 'chrome',
        uid: settings.firebaseUid ?? ''
      }
      setBookmarks((prev) => [newBm, ...prev])
      setEditing(newBm)
    })
  }

  return (
    <div className="flex flex-col h-full">
      {toast && (
        <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />
      )}

      {/* Top bar */}
      <div className="px-3 pt-3 pb-2 border-b border-surface-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">{bookmarks.length} bookmarks</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveCurrentPage}
              className="bg-primary-500 hover:bg-primary-600 text-slate-900 flex items-center gap-1.5 text-[11px] font-bold py-1 px-2.5 rounded shadow-sm transition-colors"
            >
              ＋ Save Page
            </button>
            <button
              id="sync-btn"
              onClick={handleSync}
              disabled={syncing}
              className="btn-ghost flex items-center gap-1.5 text-xs py-1 px-2.5"
            >
              {syncing ? (
                <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : '🔄'}
              {syncing ? 'Syncing…' : 'Sync'}
            </button>
          </div>
        </div>

        {/* Health filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {HEALTH_FILTERS.map((f) => (
            <button
              key={f.id}
              id={`filter-${f.id}`}
              onClick={() => setHealthFilter(f.id)}
              className={`flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all duration-150 ${
                healthFilter === f.id
                  ? 'bg-primary-500/20 border-primary-500/50 text-primary-300'
                  : 'border-surface-border text-slate-500 hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tag filter pills */}
        {allTags.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {allTags.map((tag) => (
              <TagBadge
                key={tag}
                tag={tag}
                active={activeTag === tag}
                onClick={() => setActiveTag((prev) => (prev === tag ? null : tag))}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bookmark list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <span className="text-5xl mb-3">🔖</span>
            <p className="text-slate-300 font-semibold text-sm mb-1">
              {bookmarks.length === 0 ? 'No bookmarks yet' : 'No matches'}
            </p>
            <p className="text-slate-500 text-xs leading-relaxed">
              {bookmarks.length === 0
                ? 'Click "Sync Chrome" to import your bookmarks, or save a page from Chrome.'
                : 'Try different filters.'}
            </p>
            {bookmarks.length === 0 && (
              <button onClick={handleSync} className="btn-primary mt-4 text-xs">
                🔄 Sync Now
              </button>
            )}
          </div>
        )}

        {filtered.map((bm) => (
          <BookmarkCard
            key={bm.id}
            bookmark={bm}
            onEdit={setEditing}
            onDelete={handleDelete}
          />
        ))}
      </div>

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
