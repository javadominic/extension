import { useState } from 'react'
import type { BrainBookmark } from '../types'
import TagBadge from './TagBadge'

interface Props {
  bookmark: BrainBookmark
  onSave: (note: string, tags: string[]) => void
  onSkip: () => void
}

/** Parse a raw note string (separated by \n\n---\n) into individual note entries */
function parseNotes(raw: string): string[] {
  return raw.split(/\n\n---\n/).map((n) => n.trim()).filter(Boolean)
}

/** Join multiple note entries back into the storage format */
function joinNotes(notes: string[]): string {
  return notes.filter(Boolean).join('\n\n---\n')
}

export default function AddNoteModal({ bookmark, onSave, onSkip }: Props) {
  const [notes, setNotes]     = useState<string[]>(() => parseNotes(bookmark.note))
  const [newNote, setNewNote] = useState('')
  const [tags, setTags]       = useState<string[]>(bookmark.tags)
  const [loading, setLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const domain = (() => {
    try { return new URL(bookmark.url).hostname } catch { return '' }
  })()

  async function regenerate() {
    setLoading(true)
    setAiError('')
    try {
      // Route through the background service worker - the popup cannot call
      // external APIs directly due to Manifest V3 CSP restrictions.
      const response = await chrome.runtime.sendMessage({
        type: 'SUGGEST_NOTE',
        payload: { url: bookmark.url, title: bookmark.title },
      })

      if (!response?.success) {
        if (response?.error === 'NO_KEY') {
          setAiError('Add your Gemini API key in Settings → AI tab.')
        } else if (response?.error === 'EMPTY') {
          setAiError('Gemini returned an empty suggestion. Try again or write your own note.')
        } else if (typeof response?.error === 'string' && response.error.startsWith('RATE_LIMIT')) {
          const seconds = parseInt(response.error.split(':')[1] ?? '60', 10)
          const minutes = Math.ceil(seconds / 60)
          setAiError(
            minutes > 1
              ? `⏳ Gemini rate limit hit: free tier allows ~60 requests/min. Try again in ~${minutes} minutes.`
              : `⏳ Gemini rate limit hit: try again in ~${seconds} seconds.`
          )
        } else {
          setAiError(`AI error: ${response?.error ?? 'Unknown. Check your API key in Settings.'}`)
        }
        return
      }

      const { note: suggested, tags: newTags } = response.data as { note: string; tags: string[] }
      setNewNote((prev) => prev.trim() ? `${prev.trim()} ${suggested}` : suggested)
      setTags(newTags ?? [])
    } catch (err) {
      setAiError(`Failed to reach background worker: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  function addNote() {
    const trimmed = newNote.trim()
    if (!trimmed) return
    setNotes((prev) => [...prev, trimmed])
    setNewNote('')
  }

  function removeNote(index: number) {
    setNotes((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSave() {
    const trimmed = newNote.trim()
    const allNotes = trimmed ? [...notes, trimmed] : notes
    onSave(joinNotes(allNotes), tags)
  }

  const [tagInput, setTagInput] = useState('')

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function addCustomTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (!t || tags.includes(t)) { setTagInput(''); return }
    setTags(prev => [...prev, t])
    setTagInput('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full bg-surface-card border-t border-surface-border rounded-t-2xl p-4 animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-surface-border mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
            alt=""
            className="w-8 h-8 rounded-lg"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-slate-100 font-semibold text-sm line-clamp-1">{bookmark.title}</p>
            <p className="text-slate-500 text-[11px] truncate">{domain}</p>
          </div>
          <div className="text-xs px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-400 border border-primary-500/25 font-medium">
            {notes.length > 0 ? `${notes.length} note${notes.length > 1 ? 's' : ''}` : 'New note'}
          </div>
        </div>

        {/* Existing notes as cards */}
        {notes.length > 0 && (
          <div className="mb-3 space-y-2">
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide mb-1">Your notes</p>
            {notes.map((n, i) => (
              <div key={i} className="flex items-start gap-2 bg-surface-hover rounded-xl p-3 border border-surface-border">
                <span className="text-[11px] font-bold text-primary-400 mt-0.5 shrink-0">#{i + 1}</span>
                <p className="text-slate-200 text-xs flex-1 leading-relaxed whitespace-pre-wrap">{n}</p>
                <button
                  onClick={() => removeNote(i)}
                  className="text-slate-600 hover:text-red-400 transition-colors text-sm shrink-0 mt-0.5"
                  title="Remove this note"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* New note input */}
        <label className="block text-xs text-slate-500 mb-1.5 font-medium">
          {notes.length > 0 ? 'Add another note' : 'Why did you save this?'}
        </label>
        <textarea
          id="note-textarea"
          className="input-field resize-none h-20 mb-2"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a personal note…"
        />

        {/* Regenerate */}
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={regenerate}
            disabled={loading}
            className="text-[11px] text-primary-400 hover:text-primary-300 transition-colors font-medium flex items-center gap-1"
          >
            {loading ? (
              <span className="inline-block w-3 h-3 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            ) : '✨'}
            {loading ? 'Generating…' : 'AI suggest'}
          </button>
          {newNote.trim() && (
            <button
              onClick={addNote}
              className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors font-medium border border-surface-border rounded-lg px-2 py-1"
            >
              + Add note
            </button>
          )}
        </div>

        {/* AI error */}
        {aiError && (
          <p className="text-[11px] text-amber-400 mb-3">{aiError}</p>
        )}

        {/* Tags */}
        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2 font-medium">Tags</p>

          {/* Tag input */}
          <div className="flex gap-1.5 mb-2">
            <input
              className="input-field flex-1 h-8 text-xs py-1"
              placeholder="Add a tag and press Enter…"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
            />
            <button
              onClick={addCustomTag}
              disabled={!tagInput.trim()}
              className="text-[11px] font-semibold text-primary-400 hover:text-primary-300 border border-primary-500/30 hover:border-primary-400/50 px-3 py-1 rounded-lg transition-all disabled:opacity-40"
            >
              + Add
            </button>
          </div>

          {/* Tag pills - tap to remove */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-300 border border-primary-500/25 hover:bg-red-500/15 hover:text-red-300 hover:border-red-500/30 transition-all group"
                  title="Tap to remove"
                >
                  #{tag}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">×</span>
                </button>
              ))}
            </div>
          )}
          {tags.length === 0 && (
            <p className="text-[11px] text-slate-600 italic">No tags yet: add some above or use AI suggest</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            id="modal-skip-btn"
            onClick={onSkip}
            className="btn-ghost flex-1"
          >
            Skip
          </button>
          <button
            id="modal-save-btn"
            onClick={handleSave}
            className="btn-primary flex-1"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
