import { useState, useEffect, useCallback, useRef } from 'react'
import SearchBar    from '../../components/SearchBar'
import BookmarkCard from '../../components/BookmarkCard'
import AddNoteModal from '../../components/AddNoteModal'
import Toast        from '../../components/Toast'
import { getCachedBookmarks, getSettings } from '../../lib/storage'
import { getQueryEmbedding } from '../../lib/gemini'
import { findRelatedBookmarks } from '../../lib/search'
import { updateNote, deleteBookmark } from '../../lib/bookmarks'
import { getChainLength } from '../../lib/chains'
import type { BrainBookmark } from '../../types'
import { IconSearch } from '../../components/LucideIcons'

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
        const threshold = settings.searchSuggest?.threshold ?? 2.5

        // Prefer local offline model when enabled (zero API quota), else Gemini query embedding.
        let queryEmbedding: number[] | undefined
        if (settings.localModelEnabled && settings.localModelDownloaded) {
          try {
            const res = await chrome.runtime.sendMessage({
              type: 'LOCAL_AI_EMBED',
              payload: { text: q },
            })
            if (res?.success && Array.isArray(res.data)) {
              queryEmbedding = res.data as number[]
            }
          } catch {}
        } else if (settings.geminiApiKey) {
          const emb = await getQueryEmbedding(q, settings.geminiApiKey)
          if (emb) queryEmbedding = emb
        }

        // Local BM25F + optional cosine similarity — no more sending all bookmarks to Gemini
        const matchResults = findRelatedBookmarks(q, all, threshold, queryEmbedding)
        setResults(matchResults.map(r => r.bookmark))
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
    await updateNote(editing.id, note, tags, settings.firebaseUid ?? '')
    setAll((prev) => prev.map((b) => b.id === editing.id ? { ...b, note, tags } : b))
    setEditing(null)
    setToast({ msg: 'Note saved', type: 'success' })
  }

  async function handleDelete(id: string) {
    const settings = await getSettings()
    await deleteBookmark(id, settings.firebaseUid ?? '')
    setAll((prev) => prev.filter((b) => b.id !== id))
    setResults((prev) => prev.filter((b) => b.id !== id))
    setToast({ msg: 'Bookmark deleted', type: 'success' })
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
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="w-10 h-10 rounded-full bg-surface-raised border border-border flex items-center justify-center text-text-muted mb-3">
              <IconSearch size={18} strokeWidth={1.5} />
            </div>
            <p className="text-text font-medium text-sm mb-1">Semantic search</p>
            <p className="text-text-muted text-xs leading-relaxed max-w-xs">
              Search by intent, reason, or topic across notes and saved bookmarks.
            </p>
          </div>
        )}

        {query.trim() && loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="surface-card p-3 space-y-2">
                <div className="flex gap-2 items-center">
                  <div className="w-4 h-4 rounded bg-surface-raised" />
                  <div className="h-3 bg-surface-raised rounded flex-1" />
                </div>
                <div className="h-2.5 bg-surface-raised rounded w-3/4" />
                <div className="h-2 bg-surface-raised rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {query.trim() && !loading && displayList.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <p className="text-text font-medium text-sm">No matches found</p>
            <p className="text-text-muted text-xs mt-1">Try searching with different terms</p>
          </div>
        )}

        {!loading && displayList.map((bm) => (
          <BookmarkCard
            key={bm.id}
            bookmark={bm}
            chainLength={getChainLength(bm.id, all)}
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
