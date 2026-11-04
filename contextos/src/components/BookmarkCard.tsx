import { useState } from 'react'
import type { BrainBookmark } from '../types'
import TagBadge from './TagBadge'
import {
  IconLink2,
  IconExternalLink,
  IconCopy,
  IconCheck,
  IconEdit,
  IconTrash2,
  IconShare2,
} from './LucideIcons'

interface Props {
  bookmark: BrainBookmark
  onEdit: (bm: BrainBookmark) => void
  onDelete: (id: string) => void
  onShare?: (bm: BrainBookmark) => void
  showTeamShare?: boolean
  selected?: boolean
  onSelect?: (id: string, checked: boolean) => void
  bulkMode?: boolean
  chainLength?: number
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  const w = Math.floor(d / 7)
  const mo = Math.floor(d / 30)
  if (m < 1)   return 'just now'
  if (m < 60)  return `${m}m ago`
  if (h < 24)  return `${h}h ago`
  if (d < 7)   return `${d}d ago`
  if (w < 4)   return `${w}w ago`
  return `${mo}mo ago`
}

function parseGitHubParts(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url)
    if (u.hostname !== 'github.com') return null
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.length >= 2) return { owner: parts[0], repo: parts[1] }
  } catch {}
  return null
}

const HEALTH_DOT: Record<string, string> = {
  alive:     'bg-live',
  dead:      'bg-dead',
  unchecked: 'bg-text-muted',
}

const HEALTH_LABEL: Record<string, string> = {
  alive: 'text-live',
  dead:  'text-dead',
  unchecked: 'text-text-muted',
}

export default function BookmarkCard({
  bookmark, onEdit, onDelete, onShare, showTeamShare,
  selected, onSelect, bulkMode, chainLength,
}: Props) {
  const [hovered, setHovered] = useState(false)
  const [copied, setCopied]   = useState(false)

  const domain = (() => {
    try { return new URL(bookmark.url).hostname } catch { return '' }
  })()

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  const ghParts    = parseGitHubParts(bookmark.url)
  const visibleTags = bookmark.tags.slice(0, 3)
  const extraTags   = bookmark.tags.length - 3

  function handleCopyLink() {
    navigator.clipboard.writeText(bookmark.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleOpen() {
    chrome.tabs.create({ url: bookmark.url })
  }

  function handleWayback() {
    chrome.tabs.create({ url: `https://web.archive.org/web/*/${bookmark.url}` })
  }

  return (
    <div
      className={`surface-card p-3.5 cursor-pointer group transition-colors duration-fast relative ${
        selected ? 'border-amber bg-amber-soft' : 'hover:border-border-control'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start gap-2 mb-2">
        {bulkMode && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={e => onSelect?.(bookmark.id, e.target.checked)}
            className="mt-1 flex-shrink-0 accent-amber w-3.5 h-3.5 cursor-pointer"
            onClick={e => e.stopPropagation()}
          />
        )}

        <img
          src={faviconUrl}
          alt=""
          className="w-4 h-4 rounded mt-0.5 flex-shrink-0"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />

        <div className="flex-1 min-w-0">
          <button
            className="text-text font-medium text-[13px] leading-snug line-clamp-2 hover:text-amber-text transition-colors text-left w-full cursor-pointer"
            onClick={handleOpen}
            title={bookmark.title}
          >
            {ghParts ? (
              <>
                <span className="text-text-muted font-normal">{ghParts.owner}/</span>
                <span className="font-medium text-text">{ghParts.repo}</span>
              </>
            ) : bookmark.title}
          </button>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-text-muted truncate">{domain}</span>
            {chainLength && chainLength > 1 && (
              <span
                className="inline-flex items-center gap-1 text-[10px] text-amber-text font-medium bg-amber-soft px-1.5 py-0.5 rounded border border-amber/30 flex-shrink-0"
                title={`Part of a ${chainLength}-page chain`}
              >
                <IconLink2 size={11} strokeWidth={1.5} />
                <span>Chain of {chainLength}</span>
              </span>
            )}
          </div>
        </div>

        <div className={`flex items-center gap-0.5 transition-opacity duration-fast flex-shrink-0 ${
          hovered && !bulkMode ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          {onShare && showTeamShare && (
            <button
              onClick={() => onShare(bookmark)}
              className="text-text-muted hover:text-amber transition-colors p-1 rounded hover:bg-surface-raised cursor-pointer"
              title="Share with team"
            >
              <IconShare2 size={14} strokeWidth={1.5} />
            </button>
          )}
          <button
            onClick={handleOpen}
            className="text-text-muted hover:text-amber transition-colors p-1 rounded hover:bg-surface-raised cursor-pointer"
            title="Open"
          >
            <IconExternalLink size={14} strokeWidth={1.5} />
          </button>
          <button
            onClick={handleCopyLink}
            className="text-text-muted hover:text-amber transition-colors p-1 rounded hover:bg-surface-raised cursor-pointer"
            title={copied ? 'Copied' : 'Copy link'}
          >
            {copied ? (
              <IconCheck size={14} className="text-live" strokeWidth={2} />
            ) : (
              <IconCopy size={14} strokeWidth={1.5} />
            )}
          </button>
          <button
            onClick={() => onEdit(bookmark)}
            className="text-text-muted hover:text-amber transition-colors p-1 rounded hover:bg-surface-raised cursor-pointer"
            title="Edit note & tags"
          >
            <IconEdit size={14} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => onDelete(bookmark.id)}
            className="text-text-muted hover:text-danger transition-colors p-1 rounded hover:bg-surface-raised cursor-pointer"
            title="Delete"
          >
            <IconTrash2 size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {bookmark.note && (
        <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed mb-2 pl-6">
          {bookmark.note}
        </p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap pl-6">
        {visibleTags.map(tag => (
          <TagBadge key={tag} tag={tag} />
        ))}
        {extraTags > 0 && (
          <span className="inline-flex items-center text-[10px] text-text-muted rounded px-1.5 py-0.5 bg-surface-raised border border-border">
            +{extraTags}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2.5 flex-shrink-0">
          {bookmark.health === 'dead' && (
            <button
              onClick={handleWayback}
              className="text-[10px] text-text-muted hover:text-amber transition-colors font-medium cursor-pointer"
              title="Open in Wayback Machine archive"
            >
              Wayback
            </button>
          )}

          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${HEALTH_LABEL[bookmark.health]}`}
            title={bookmark.lastChecked ? `Last checked ${new Date(bookmark.lastChecked).toLocaleDateString()}` : undefined}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${HEALTH_DOT[bookmark.health]}`} />
            <span>{bookmark.health === 'alive' ? 'Live' : bookmark.health === 'dead' ? 'Dead' : 'Unchecked'}</span>
          </span>

          <span className="text-[10px] text-text-muted tabular-nums">
            {timeAgo(bookmark.addedAt)}
          </span>
        </div>
      </div>
    </div>
  )
}
