// ============================================================
// BrainMark — SearchPage
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react'
import SearchBar    from '../../components/SearchBar'
import BookmarkCard from '../../components/BookmarkCard'
import AddNoteModal from '../../components/AddNoteModal'
import Toast        from '../../components/Toast'
import { getCachedBookmarks, getSettings } from '../../lib/storage'
import { semanticSearch } from '../../lib/gemini'
import { updateNote, deleteBookmark } from '../../lib/bookmarks'
import type { BrainBookmark } from '../../types'

export default function SearchPage() {
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState<BrainBookmark[]>([])
  const [all,       setAll]       = useState<BrainBookmark[]>([])
  const [loading,   setLoading]   = useState(false)
  const [editing,   setEditing]   = useState<BrainBookmark | null>(null)
  const [toast,     setToast]     = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    getCachedBookmarks().then(setAll)
  }, [])

  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) { setResults([]); return }
      setLoading(true)
      try {
        const settings = await getSettings()
        let ids: string[]
        if (settings.geminiApiKey) {
          ids = await semanticSearch(q, all, settings.geminiApiKey)
        } else {
          const lq = q.toLowerCase()
          ids = all
            .filter(
              (b) =>
                b.title.toLowerCase().includes(lq) ||
                b.note.toLowerCase().includes(lq) ||
                b.tags.some((t) => t.includes(lq))
            )
            .map((b) => b.id)
        }
        const idSet = new Set(ids)
        const ordered = ids
          .map((id) => all.find((b) => b.id === id))
          .filter(Boolean) as BrainBookmark[]
        const rest = all.filter((b) => !idSet.has(b.id) && (
          b.title.toLowerCase().includes(q.toLowerCase()) ||
          b.note.toLowerCase().includes(q.toLowerCase())
        ))
        setResults([...ordered, ...rest])
      } finally {
        setLoading(false)
      }
    },
    [all]
  )

  function handleQueryChange(v: string) {
    setQuery(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(v), 400)
  }

  async function handleSaveNote(note: string, tags: string[]) {
    if (!editing) return
    const settings = await getSettings()
    await updateNote(editing.id, note, settings.firebaseUid ?? '')
    setAll((prev) => prev.map((b) => b.id === editing.id ? { ...b, note, tags } : b))
    setEditing(null)
    setToast({ msg: 'Note saved!', type: 'success' })
  }

  async function handleDelete(id: string) {
    const settings = await getSettings()
    await deleteBookmark(id, settings.firebaseUid ?? '')
    setAll((prev) => prev.filter((b) => b.id !== id))
    setResults((prev) => prev.filter((b) => b.id !== id))
    setToast({ msg: 'Bookmark deleted.', type: 'success' })
  }

  const displayList = query.trim() ? results : []

  return (
    <div className="flex flex-col h-full px-3 pt-3 pb-2 gap-3">
      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      <SearchBar value={query} onChange={handleQueryChange} loading={loading} />

      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {!query.trim() && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <span className="text-5xl mb-3">🔍</span>
            <p className="text-slate-300 font-semibold text-sm mb-1">AI-powered search</p>
            <p className="text-slate-500 text-xs leading-relaxed">
              Type anything — topics, reasons, keywords. Gemini finds the most relevant bookmarks semantically.
            </p>
          </div>
        )}

        {query.trim() && loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-3 animate-pulse">
                <div className="flex gap-2 items-center mb-2">
                  <div className="w-5 h-5 rounded bg-surface-border" />
                  <div className="h-3 bg-surface-border rounded flex-1" />
                </div>
                <div className="h-2.5 bg-surface-border rounded w-3/4 mb-1" />
                <div className="h-2.5 bg-surface-border rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {query.trim() && !loading && displayList.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <span className="text-4xl mb-3">🤔</span>
            <p className="text-slate-400 text-sm font-medium">No matches found</p>
            <p className="text-slate-600 text-xs mt-1">Try different keywords</p>
          </div>
        )}

        {!loading && displayList.map((bm) => (
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
