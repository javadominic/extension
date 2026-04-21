// ============================================================
// BrainMark — BookmarkCard Component
// ============================================================
import { useState } from 'react'
import type { BrainBookmark } from '../types'
import TagBadge   from './TagBadge'
import HealthBadge from './HealthBadge'

interface Props {
  bookmark: BrainBookmark
  onEdit: (bm: BrainBookmark) => void
  onDelete: (id: string) => void
  onShare?: (bm: BrainBookmark) => void
  showTeamShare?: boolean
}

export default function BookmarkCard({ bookmark, onEdit, onDelete, onShare, showTeamShare }: Props) {
  const [hovered, setHovered] = useState(false)
  const [copied, setCopied]   = useState(false)

  const domain = (() => {
    try { return new URL(bookmark.url).hostname } catch { return '' }
  })()

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`

  function handleCopy() {
    navigator.clipboard.writeText(bookmark.note ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleOpen() {
    chrome.tabs.create({ url: bookmark.url })
  }

  return (
    <div
      className="glass-card p-3 cursor-pointer group animate-fade-in relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Title row */}
      <div className="flex items-start gap-2 mb-1.5">
        <img
          src={faviconUrl}
          alt=""
          className="w-5 h-5 rounded mt-0.5 flex-shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <div className="flex-1 min-w-0">
          <button
            className="text-slate-100 font-semibold text-[13px] leading-snug line-clamp-1 hover:text-primary-300 transition-colors text-left w-full"
            onClick={handleOpen}
            title={bookmark.title}
          >
            {bookmark.title}
          </button>
          <span className="text-[10px] text-slate-600 block truncate">{domain}</span>
        </div>

        {/* Action icons */}
        <div
          className={`flex items-center gap-1 transition-opacity duration-150 flex-shrink-0 ${
            hovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {onShare && showTeamShare && (
            <button
              onClick={() => onShare(bookmark)}
              className="text-slate-500 hover:text-primary-400 transition-colors p-1 rounded text-sm"
              title="Share with team"
            >
              👥
            </button>
          )}
          <button
            onClick={() => onEdit(bookmark)}
            className="text-slate-500 hover:text-primary-400 transition-colors p-1 rounded text-sm"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(bookmark.id)}
            className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded text-sm"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Note */}
      {bookmark.note && (
        <p className="text-[12px] text-slate-400 line-clamp-2 leading-snug mb-2 pl-7">
          {bookmark.note}
        </p>
      )}

      {/* Footer: tags + health + copy */}
      <div className="flex items-center gap-1.5 flex-wrap pl-7">
        {bookmark.tags.slice(0, 3).map((tag) => (
          <TagBadge key={tag} tag={tag} />
        ))}

        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <HealthBadge status={bookmark.health} lastChecked={bookmark.lastChecked} />
          <button
            onClick={handleCopy}
            className="text-[10px] text-slate-500 hover:text-primary-400 transition-colors font-medium"
            title="Copy note"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}
