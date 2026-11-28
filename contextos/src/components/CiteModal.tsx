import { useState, useMemo } from 'react'
import type { BrainBookmark, CitationMetadata } from '../types'
import {
  CITATION_STYLES,
  formatCitation,
  formatBibliography,
  buildTextFragmentUrl,
  type CitationStyle,
} from '../lib/citations'
import {
  IconX,
  IconCopy,
  IconCheck,
  IconExternalLink,
  IconEdit,
  IconQuote,
} from './LucideIcons'

interface Props {
  bookmarks: BrainBookmark[]
  title?: string
  onSaveMeta?: (bookmarkId: string, citationMeta: CitationMetadata, quote?: string) => Promise<void> | void
  onClose: () => void
}

export default function CiteModal({ bookmarks, title, onSaveMeta, onClose }: Props) {
  const isSingle = bookmarks.length === 1
  const single = isSingle ? bookmarks[0] : null

  const [style, setStyle] = useState<CitationStyle>('apa')
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Editable metadata fields (for single bookmark mode)
  const [authorsText, setAuthorsText] = useState(
    single?.citationMeta?.authors?.join(', ') ?? ''
  )
  const [publishedDate, setPublishedDate] = useState(
    single?.citationMeta?.publishedDate ?? ''
  )
  const [venue, setVenue] = useState(
    single?.citationMeta?.journal || single?.citationMeta?.siteName || ''
  )
  const [doi, setDoi] = useState(single?.citationMeta?.doi ?? '')
  const [volume, setVolume] = useState(single?.citationMeta?.volume ?? '')
  const [issue, setIssue] = useState(single?.citationMeta?.issue ?? '')
  const [pages, setPages] = useState(single?.citationMeta?.pages ?? '')
  const [quote, setQuote] = useState(single?.quote ?? '')

  const previewBookmark = useMemo<BrainBookmark | null>(() => {
    if (!single) return null
    const parsedAuthors = authorsText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    return {
      ...single,
      quote: quote.trim() || undefined,
      citationMeta: {
        ...single.citationMeta,
        authors: parsedAuthors,
        publishedDate: publishedDate.trim() || undefined,
        journal: single.citationMeta?.journal ? venue.trim() || undefined : undefined,
        siteName: !single.citationMeta?.journal ? venue.trim() || undefined : single.citationMeta?.siteName,
        doi: doi.trim() || undefined,
        volume: volume.trim() || undefined,
        issue: issue.trim() || undefined,
        pages: pages.trim() || undefined,
      },
    }
  }, [single, authorsText, publishedDate, venue, doi, volume, issue, pages, quote])

  const formattedText = useMemo(() => {
    if (previewBookmark) return formatCitation(previewBookmark, style)
    return formatBibliography(bookmarks, style)
  }, [previewBookmark, bookmarks, style])

  function handleCopy() {
    navigator.clipboard.writeText(formattedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  async function handleSaveMeta() {
    if (!previewBookmark || !onSaveMeta) return
    setSaving(true)
    try {
      await onSaveMeta(
        previewBookmark.id,
        previewBookmark.citationMeta ?? { authors: [] },
        previewBookmark.quote
      )
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[360px] max-h-[520px] flex flex-col surface-card border border-border-control shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-surface-raised">
          <div className="flex items-center gap-2 min-w-0">
            <IconQuote size={14} className="text-amber flex-shrink-0" />
            <h2 className="text-xs font-semibold text-text truncate">
              {title || (isSingle ? 'Cite source' : `Export bibliography (${bookmarks.length})`)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text p-1 rounded cursor-pointer"
            aria-label="Close"
          >
            <IconX size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {/* Style Tabs */}
          <div className="flex gap-1 p-1 rounded-btn bg-surface-raised border border-border">
            {CITATION_STYLES.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyle(s.id)}
                className={`flex-1 text-[11px] py-1 rounded font-medium transition-colors cursor-pointer ${
                  style === s.id
                    ? 'bg-amber text-[#1A1405] font-semibold'
                    : 'text-text-secondary hover:text-text'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Formatted Citation Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-muted font-medium">
                {style === 'bibtex' ? 'BibTeX entry (Overleaf / LaTeX)' : 'Formatted reference'}
              </span>
              {isSingle && onSaveMeta && (
                <button
                  type="button"
                  onClick={() => setEditing(v => !v)}
                  className="inline-flex items-center gap-1 text-[11px] text-amber-text hover:underline cursor-pointer"
                >
                  <IconEdit size={11} />
                  <span>{editing ? 'Hide fields' : 'Edit details'}</span>
                </button>
              )}
            </div>

            <pre className="p-2.5 rounded-btn bg-bg border border-border text-[11px] text-text leading-relaxed whitespace-pre-wrap break-words font-mono max-h-40 overflow-y-auto select-all">
              {formattedText}
            </pre>
          </div>

          {/* Saved Quote + Text-Fragment Deep Link */}
          {isSingle && quote.trim() && !editing && (
            <div className="p-2.5 rounded-btn bg-amber-soft/30 border border-amber/25 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-amber-text font-medium">Cited passage</span>
                <button
                  type="button"
                  onClick={() => chrome.tabs.create({ url: buildTextFragmentUrl(single!.url, quote) })}
                  className="inline-flex items-center gap-1 text-[10px] text-amber-text hover:underline cursor-pointer"
                >
                  <span>Jump to highlight</span>
                  <IconExternalLink size={10} />
                </button>
              </div>
              <p className="text-[11px] text-text-secondary italic line-clamp-3 leading-relaxed">
                “{quote.trim()}”
              </p>
            </div>
          )}

          {/* Editable Metadata Form */}
          {isSingle && editing && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div>
                <label className="block text-[10px] text-text-muted mb-1">
                  Authors (comma-separated)
                </label>
                <input
                  type="text"
                  value={authorsText}
                  onChange={e => setAuthorsText(e.target.value)}
                  placeholder="Jane Doe, John Smith"
                  className="input-field text-xs py-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Year / Date</label>
                  <input
                    type="text"
                    value={publishedDate}
                    onChange={e => setPublishedDate(e.target.value)}
                    placeholder="2026"
                    className="input-field text-xs py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">DOI</label>
                  <input
                    type="text"
                    value={doi}
                    onChange={e => setDoi(e.target.value)}
                    placeholder="10.1145/..."
                    className="input-field text-xs py-1.5 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-text-muted mb-1">
                  Journal / Conference / Website
                </label>
                <input
                  type="text"
                  value={venue}
                  onChange={e => setVenue(e.target.value)}
                  placeholder="Nature, arXiv, MDN Web Docs"
                  className="input-field text-xs py-1.5"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Vol</label>
                  <input
                    type="text"
                    value={volume}
                    onChange={e => setVolume(e.target.value)}
                    placeholder="12"
                    className="input-field text-xs py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Issue</label>
                  <input
                    type="text"
                    value={issue}
                    onChange={e => setIssue(e.target.value)}
                    placeholder="3"
                    className="input-field text-xs py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Pages</label>
                  <input
                    type="text"
                    value={pages}
                    onChange={e => setPages(e.target.value)}
                    placeholder="45-58"
                    className="input-field text-xs py-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-text-muted mb-1">
                  Cited quote (enables jump-to-highlight)
                </label>
                <textarea
                  rows={2}
                  value={quote}
                  onChange={e => setQuote(e.target.value)}
                  placeholder="Paste key sentence from the source…"
                  className="input-field text-xs py-1.5 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-t border-border bg-surface-raised">
          {isSingle && editing && onSaveMeta ? (
            <button
              type="button"
              onClick={handleSaveMeta}
              disabled={saving}
              className="btn-secondary text-xs py-1.5 px-3 min-h-[30px] cursor-pointer"
            >
              {saving ? 'Saving…' : 'Save details'}
            </button>
          ) : (
            <span className="text-[11px] text-text-muted">
              {isSingle ? 'Auto-extracted from page' : `${bookmarks.length} references`}
            </span>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="btn-primary text-xs py-1.5 px-3 min-h-[30px] flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
            <span>{copied ? 'Copied' : isSingle ? 'Copy citation' : 'Copy bibliography'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
