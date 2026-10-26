import { useState } from 'react'
import type { BrainBookmark } from '../types'
import type { SiteGroup, SiteChainNode } from '../lib/chains'

interface Props {
  group: SiteGroup
  onOpenAll: (group: SiteGroup) => void
  onAddToChain: (group: SiteGroup) => void
  onUnlink: (bookmarkId: string) => void
  onShowInGraph: (group: SiteGroup) => void
  onEdit?: (bm: BrainBookmark) => void
  onDelete?: (id: string) => void
}

const HEALTH_DOT: Record<string, string> = {
  alive:     'bg-emerald-400',
  dead:      'bg-red-400 animate-pulse',
  unchecked: 'bg-slate-500',
}

function parsePathname(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname + (u.search ? u.search : '') || '/'
  } catch {
    return '/'
  }
}

export default function SiteChainCard({
  group,
  onOpenAll,
  onAddToChain,
  onUnlink,
  onShowInGraph,
  onEdit,
  onDelete,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showAllNodes, setShowAllNodes] = useState(false)

  const isGitHubRepo = group.domainKey.includes('/') && !group.domainKey.includes('.')
  const [owner, repo] = isGitHubRepo ? group.domainKey.split('/') : ['', '']

  const visibleNodes = showAllNodes ? group.nodes : group.nodes.slice(0, 5)
  const hiddenCount = group.nodes.length - 5

  return (
    <div className={`glass-card transition-all duration-200 overflow-hidden ${expanded ? 'border-primary-500/50 bg-primary-500/[0.03]' : 'hover:border-slate-700'}`}>
      {/* ── Group Header Card ────────────────────────────────────────── */}
      <div
        className="p-3.5 cursor-pointer select-none space-y-2.5"
        onClick={() => setExpanded(prev => !prev)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <img
              src={group.favicon}
              alt=""
              className="w-5 h-5 rounded flex-shrink-0"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-slate-100 font-semibold truncate">
                {isGitHubRepo ? (
                  <>
                    <span className="text-slate-400 font-normal">{owner}/</span>
                    <span className="font-bold text-primary-300">{repo}</span>
                  </>
                ) : (
                  <span>{group.domainKey}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-500/15 text-primary-300 border border-primary-500/30">
              <span>🔗</span>
              <span>{group.totalCount} linked page{group.totalCount > 1 ? 's' : ''}</span>
            </span>

            <button
              type="button"
              className="text-slate-400 hover:text-slate-200 p-1 rounded transition-transform"
              title={expanded ? 'Collapse chain' : 'Expand chain'}
            >
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Breadcrumb path summary ───────────────────────────────── */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 overflow-x-auto no-scrollbar pt-0.5">
          {group.breadcrumbs.map((seg, idx) => (
            <span key={idx} className="flex items-center gap-1.5 flex-shrink-0 font-mono">
              {idx > 0 && <span className="text-primary-400 font-bold text-[10px]">→</span>}
              <span className={`px-1.5 py-0.5 rounded bg-surface-border/50 text-[10px] ${idx === 0 ? 'text-primary-400/90' : 'text-slate-300'}`}>
                {seg}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Expanded Chain ───────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-surface-border/80 bg-black/20 p-3.5 space-y-3 animate-fade-in">
          {/* Action toolbar */}
          <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-surface-border/60 text-xs">
            <button
              onClick={e => { e.stopPropagation(); onOpenAll(group) }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary-500/15 hover:bg-primary-500/25 text-primary-300 border border-primary-500/30 text-[11px] font-semibold transition-colors"
              title="Open all pages in new tabs"
            >
              <span>↗</span>
              <span>Open all ({group.totalCount})</span>
            </button>

            <button
              onClick={e => { e.stopPropagation(); onAddToChain(group) }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-border/60 hover:bg-surface-border text-slate-300 text-[11px] font-semibold transition-colors"
              title="Add a page to this chain"
            >
              <span>＋</span>
              <span>Add to chain</span>
            </button>

            <button
              onClick={e => { e.stopPropagation(); onShowInGraph(group) }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-border/60 hover:bg-surface-border text-slate-300 text-[11px] font-semibold transition-colors ml-auto"
              title="View this chain and domain in Graph tab"
            >
              <span>🕸️</span>
              <span>Show in Graph</span>
            </button>
          </div>

          {/* Vertical Chain Visualization */}
          <div className="relative ml-3 pl-4 border-l-2 border-primary-500/40 space-y-3.5 py-1">
            {visibleNodes.map((node: SiteChainNode) => {
              const bm = node.bookmark
              const path = parsePathname(bm.url)
              const statusDot = HEALTH_DOT[bm.health] ?? 'bg-slate-500'

              return (
                <div key={bm.id} className="relative group/node text-xs">
                  {/* Node Circle */}
                  {node.isRoot ? (
                    <span
                      className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-primary-500 ring-4 ring-primary-500/20"
                      title="Start of chain (Root page)"
                    />
                  ) : (
                    <span
                      className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 border-primary-400 bg-surface-card"
                      title="Linked child page"
                    />
                  )}

                  <div className="glass-card p-2.5 hover:border-primary-500/40 transition-colors space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <a
                        href={bm.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-slate-200 hover:text-primary-300 transition-colors text-[12px] line-clamp-2 leading-snug flex-1"
                        title={bm.title}
                      >
                        {bm.title}
                      </a>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} title={`Status: ${bm.health}`} />
                        <a
                          href={bm.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-500 hover:text-slate-300 p-0.5"
                          title="Open in new tab"
                        >
                          ↗
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="font-mono text-slate-400 truncate max-w-[200px]" title={path}>
                        {path}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {!node.isRoot && (
                          <button
                            onClick={e => { e.stopPropagation(); onUnlink(bm.id) }}
                            className="text-slate-500 hover:text-red-400 transition-colors font-medium text-[10px]"
                            title="Unlink from parent"
                          >
                            Unlink
                          </button>
                        )}
                        {onEdit && (
                          <button
                            onClick={e => { e.stopPropagation(); onEdit(bm) }}
                            className="text-slate-500 hover:text-primary-300 transition-colors font-medium text-[10px]"
                            title="Edit bookmark note"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {/* "Opened from <parent>" hint */}
                    {node.parent && (
                      <div className="text-[10px] text-primary-400/80 flex items-center gap-1 pt-0.5 truncate">
                        <span>↳ Opened from:</span>
                        <span className="font-medium text-slate-300 truncate" title={node.parent.title}>
                          {node.parent.title}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Cap visible chain length at 5 with "+N more" link ──── */}
          {hiddenCount > 0 && (
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setShowAllNodes(prev => !prev) }}
                className="text-xs text-primary-400 hover:text-primary-300 font-semibold px-3 py-1 rounded-full bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/20 transition-all"
              >
                {showAllNodes ? '▲ Show less' : `＋ ${hiddenCount} more pages in chain`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
