import { useState } from 'react'
import type { BrainBookmark } from '../types'
import TagBadge from './TagBadge'
import { IconBrain, IconPlus, IconX } from './LucideIcons'

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
      const response = await chrome.runtime.sendMessage({
        type: 'SUGGEST_NOTE',
        payload: { url: bookmark.url, title: bookmark.title },
      })

      if (!response?.success) {
        if (response?.error === 'NO_KEY') {
          setAiError('Add your Gemini API key in Settings.')
        } else if (response?.error === 'EMPTY') {
          setAiError('No suggestion returned. Write your own note below.')
        } else if (typeof response?.error === 'string' && response.error.startsWith('RATE_LIMIT')) {
          const seconds = parseInt(response.error.split(':')[1] ?? '60', 10)
          const minutes = Math.ceil(seconds / 60)
          setAiError(
            minutes > 1
              ? `Rate limit reached. Try again in ~${minutes} minutes.`
              : `Rate limit reached. Try again in ~${seconds} seconds.`
          )
        } else {
          setAiError(`AI error: ${response?.error ?? 'Check your API key in Settings.'}`)
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full bg-surface border-t border-border rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto space-y-3">
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-2" />

        {/* Header */}
        <div className="flex items-center gap-2.5">
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
            alt=""
            className="w-6 h-6 rounded"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-text font-medium text-sm line-clamp-1">{bookmark.title}</p>
            <p className="text-text-muted text-[11px] truncate">{domain}</p>
          </div>
          <span className="chip-neutral text-[10px] font-mono">
            {notes.length > 0 ? `${notes.length} note${notes.length > 1 ? 's' : ''}` : 'New note'}
          </span>
        </div>

        {/* Existing notes as cards */}
        {notes.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-text-muted">Saved notes</p>
            {notes.map((n, i) => (
              <div key={i} className="flex items-start gap-2 bg-surface-raised rounded-btn p-2.5 border border-border">
                <span className="text-[10px] font-mono text-amber mt-0.5 shrink-0">#{i + 1}</span>
                <p className="text-text text-xs flex-1 leading-relaxed whitespace-pre-wrap">{n}</p>
                <button
                  onClick={() => removeNote(i)}
                  className="text-text-muted hover:text-danger p-0.5 shrink-0"
                  title="Remove note"
                >
                  <IconX size={12} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* New note input */}
        <div>
          <label className="block text-xs text-text-muted mb-1">
            {notes.length > 0 ? 'Add another note' : 'Personal note'}
          </label>
          <textarea
            id="note-textarea"
            className="input-field resize-none h-20 text-xs"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add context or notes on this page…"
          />
        </div>

        {/* Regenerate */}
        <div className="flex items-center justify-between">
          <button
            onClick={regenerate}
            disabled={loading}
            className="text-xs text-amber-text hover:underline font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-3 h-3 border-2 border-amber border-t-transparent rounded-full animate-spin" />
            ) : (
              <IconBrain size={13} strokeWidth={1.5} />
            )}
            <span>{loading ? 'Suggesting…' : 'AI suggest note'}</span>
          </button>
          {newNote.trim() && (
            <button
              onClick={addNote}
              className="btn-secondary text-xs py-1 px-2 min-h-[28px]"
            >
              Add note
            </button>
          )}
        </div>

        {aiError && (
          <p className="text-xs text-dead leading-snug">{aiError}</p>
        )}

        {/* Tags */}
        <div className="space-y-1.5 pt-1 border-t border-border">
          <p className="text-xs text-text-muted">Tags</p>

          <div className="flex gap-1.5">
            <input
              className="input-field flex-1 text-xs py-1 min-h-[32px]"
              placeholder="Add tag and press Enter"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
            />
            <button
              onClick={addCustomTag}
              disabled={!tagInput.trim()}
              className="btn-secondary text-xs py-1 px-3 min-h-[32px] disabled:opacity-40"
            >
              Add
            </button>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="chip-neutral text-xs hover:border-danger hover:text-danger group cursor-pointer"
                  title="Remove tag"
                >
                  <span>#{tag}</span>
                  <span className="text-text-muted group-hover:text-danger text-[10px]">×</span>
                </button>
              ))}
            </div>
          )}
          {tags.length === 0 && (
            <p className="text-[11px] text-text-muted">No tags added yet</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            id="modal-skip-btn"
            onClick={onSkip}
            className="btn-ghost flex-1 text-xs"
          >
            Cancel
          </button>
          <button
            id="modal-save-btn"
            onClick={handleSave}
            className="btn-primary flex-1 text-xs"
          >
            Save note
          </button>
        </div>
      </div>
    </div>
  )
}
