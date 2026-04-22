import { useState } from 'react'
import type { BrainBookmark } from '../types'
import TagBadge from './TagBadge'
import { suggestNote, autoTag } from '../lib/gemini'
import { getSettings } from '../lib/storage'

interface Props {
  bookmark: BrainBookmark
  onSave: (note: string, tags: string[]) => void
  onSkip: () => void
}

export default function AddNoteModal({ bookmark, onSave, onSkip }: Props) {
  const [note, setNote]         = useState(bookmark.note)
  const [tags, setTags]         = useState<string[]>(bookmark.tags)
  const [loading, setLoading]   = useState(false)
  const [copied, setCopied]     = useState(false)

  const domain = (() => {
    try { return new URL(bookmark.url).hostname } catch { return '' }
  })()

  async function regenerate() {
    setLoading(true)
    try {
      const settings = await getSettings()
      if (!settings.geminiApiKey) return
      const newNote = await suggestNote(bookmark.url, bookmark.title, settings.geminiApiKey)
      const newTags = await autoTag(bookmark.url, bookmark.title, newNote, settings.geminiApiKey)
      setNote(newNote)
      setTags(newTags)
    } finally {
      setLoading(false)
    }
  }

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function handleCopy() {
    navigator.clipboard.writeText(note)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full bg-surface-card border-t border-surface-border rounded-t-2xl p-4 animate-slide-up">
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
            AI note
          </div>
        </div>

        {/* Note textarea */}
        <label className="block text-xs text-slate-500 mb-1.5 font-medium">
          Why did you save this?
        </label>
        <textarea
          id="note-textarea"
          className="input-field resize-none h-20 mb-2"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a personal note…"
        />

        {/* Regenerate + copy */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={regenerate}
            disabled={loading}
            className="text-[11px] text-primary-400 hover:text-primary-300 transition-colors font-medium flex items-center gap-1"
          >
            {loading ? (
              <span className="inline-block w-3 h-3 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            ) : '✨'}
            {loading ? 'Regenerating…' : 'Regenerate suggestion'}
          </button>
          <button
            onClick={handleCopy}
            className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors font-medium"
          >
            {copied ? '✓ Copied' : '📋 Copy note'}
          </button>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-slate-500 mb-2 font-medium">Suggested tags (tap to toggle)</p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <TagBadge key={tag} tag={tag} active onClick={() => toggleTag(tag)} />
              ))}
            </div>
          </div>
        )}

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
            onClick={() => onSave(note, tags)}
            className="btn-primary flex-1"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  )
}
