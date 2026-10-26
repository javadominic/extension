import { useState } from 'react'
import type { BrainBookmark } from '../types'
import TagBadge from './TagBadge'

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
  alive:     'bg-emerald-400',
  dead:      'bg-red-400 animate-pulse',
  unchecked: 'bg-slate-500',
}

const HEALTH_LABEL: Record<string, string> = {
  alive: 'text-emerald-400',
  dead:  'text-red-400',
  unchecked: 'text-slate-500',
}

export default function BookmarkCard({
  bookmark, onEdit, onDelete, onShare, showTeamShare,
  selected, onSelect, bulkMode, chainLength,
}: Props) {
  const [hovered, setHovered]   = useState(false)
  const [copied, setCopied]     = useState(false)

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
      className={`glass-card p-3.5 cursor-pointer group animate-fade-in relative ${
        selected ? 'border-primary-500/60 bg-primary-500/5' : ''
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
            className="mt-1 flex-shrink-0 accent-amber-400 w-3.5 h-3.5"
            onClick={e => e.stopPropagation()}
          />
        )}

        <img
          src={faviconUrl}
          alt=""
          className="w-5 h-5 rounded mt-0.5 flex-shrink-0"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />

        <div className="flex-1 min-w-0">
          <button
            className="text-slate-100 font-semibold text-[13px] leading-snug line-clamp-2 hover:text-primary-300 transition-colors text-left w-full"
            onClick={handleOpen}
            title={bookmark.title}
          >
            {ghParts ? (
              <>
                <span className="text-slate-500 font-normal">{ghParts.owner}/</span>
                <span className="font-bold">{ghParts.repo}</span>
              </>
            ) : bookmark.title}
          </button>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-600 truncate">{domain}</span>
            {chainLength && chainLength > 1 && (
              <span
                className="inline-flex items-center gap-1 text-[9px] text-primary-400 font-semibold bg-primary-500/15 px-1.5 py-0.2 rounded border border-primary-500/30 flex-shrink-0"
                title={`Part of a ${chainLength}-page chain`}
              >
                <span>🔗</span>
                <span>part of a {chainLength}-page chain</span>
              </span>
            )}
          </div>
        </div>

        <div className={`flex items-center gap-0.5 transition-opacity duration-150 flex-shrink-0 ${
          hovered && !bulkMode ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          {onShare && showTeamShare && (
            <button
              onClick={() => onShare(bookmark)}
              className="text-slate-500 hover:text-primary-400 transition-colors p-1.5 rounded hover:bg-white/5"
              title="Share with team"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
              </svg>
            </button>
          )}
          <button
            onClick={handleOpen}
            className="text-slate-500 hover:text-primary-400 transition-colors p-1.5 rounded hover:bg-white/5"
            title="Open"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
          <button
            onClick={handleCopyLink}
            className="text-slate-500 hover:text-primary-400 transition-colors p-1.5 rounded hover:bg-white/5"
            title={copied ? 'Copied!' : 'Copy link'}
          >
            {copied ? (
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => onEdit(bookmark)}
            className="text-slate-500 hover:text-primary-400 transition-colors p-1.5 rounded hover:bg-white/5"
            title="Edit note & tags"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(bookmark.id)}
            className="text-slate-500 hover:text-red-400 transition-colors p-1.5 rounded hover:bg-white/5"
            title="Delete"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {bookmark.note && (
        <p className="text-[12px] text-slate-400 line-clamp-2 leading-snug mb-2.5 pl-7">
          {bookmark.note}
        </p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap pl-7">
        {visibleTags.map(tag => (
          <TagBadge key={tag} tag={tag} />
        ))}
        {extraTags > 0 && (
          <span className="inline-flex items-center text-[10px] font-semibold rounded-full px-2 py-0.5 bg-white/5 text-slate-500 border border-white/10">
            +{extraTags}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {bookmark.health === 'dead' && (
            <button
              onClick={handleWayback}
              className="text-[10px] text-slate-500 hover:text-primary-400 transition-colors font-medium flex items-center gap-0.5"
              title="Try Wayback Machine archive"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Wayback
            </button>
          )}

          <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold ${HEALTH_LABEL[bookmark.health]}`}
            title={bookmark.lastChecked ? `Last checked: ${new Date(bookmark.lastChecked).toLocaleDateString()}` : undefined}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${HEALTH_DOT[bookmark.health]}`} />
            {bookmark.health === 'alive' ? 'Live' : bookmark.health === 'dead' ? 'Dead' : 'Unchecked'}
          </span>

          <span className="text-[10px] text-slate-600">
            {timeAgo(bookmark.addedAt)}
          </span>
        </div>
      </div>
    </div>
  )
}
