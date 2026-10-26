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
    <div className={`glass-card transition-all duration-200 overflow-hidden ${expanded ? 'border-amber-500/50 bg-amber-500/[0.03]' : 'hover:border-slate-700'}`}>
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
              <div className="text-[13px] font-semibold truncate">
                {isGitHubRepo ? (
                  <>
                    <span className="text-slate-300 font-normal">{owner}/</span>
                    <span className="font-bold text-amber-400">{repo}</span>
                  </>
                ) : (
                  <span className="text-slate-100 font-semibold">{group.domainKey}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
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
        <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto no-scrollbar pt-0.5">
          {group.breadcrumbs.map((seg, idx) => (
            <span key={idx} className="flex items-center gap-1.5 flex-shrink-0 font-mono">
              {idx > 0 && <span className="text-amber-400 font-bold text-[10px]">→</span>}
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                idx === 0
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-bold'
                  : 'bg-slate-800 text-slate-200 border-slate-700/70'
              }`}>
                {seg}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Expanded Chain ───────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-slate-800 bg-black/40 p-3.5 space-y-3 animate-fade-in">
          {/* Action toolbar */}
          <div className="flex items-center gap-2 flex-wrap pb-2.5 border-b border-slate-800 text-xs">
            <button
              onClick={e => { e.stopPropagation(); onOpenAll(group) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold transition-colors"
              title="Open all pages in new tabs"
            >
              <span>↗</span>
              <span>Open all ({group.totalCount})</span>
            </button>

            <button
              onClick={e => { e.stopPropagation(); onAddToChain(group) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600/70 text-[11px] font-semibold transition-colors shadow-sm"
              title="Add a page to this chain"
            >
              <span className="text-amber-400 font-bold">＋</span>
              <span>Add to chain</span>
            </button>

            <button
              onClick={e => { e.stopPropagation(); onShowInGraph(group) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600/70 text-[11px] font-semibold transition-colors shadow-sm ml-auto"
              title="View this chain and domain in Graph tab"
            >
              <span>🕸️</span>
              <span>Show in Graph</span>
            </button>
          </div>

          {/* Vertical Chain Visualization */}
          <div className="space-y-0 py-1">
            {visibleNodes.map((node: SiteChainNode, idx: number) => {
              const bm = node.bookmark
              const path = parsePathname(bm.url)
              const statusDot = HEALTH_DOT[bm.health] ?? 'bg-slate-500'
              const isFirst = idx === 0
              const isLast = idx === visibleNodes.length - 1

              return (
                <div key={bm.id} className="relative flex items-stretch gap-2.5 text-xs group/node">
                  {/* Timeline Column */}
                  <div className="relative flex flex-col items-center flex-shrink-0 w-6">
                    {/* Top connecting line */}
                    {isFirst ? (
                      <div className="w-0.5 h-3.5" />
                    ) : (
                      <div className="w-0.5 h-3.5 bg-amber-500/60" />
                    )}

                    {/* Node Circle */}
                    {node.isRoot ? (
                      <span
                        className="w-3.5 h-3.5 rounded-full bg-amber-400 ring-4 ring-amber-500/25 flex-shrink-0 shadow-sm"
                        title="Start of chain (Root page)"
                      />
                    ) : (
                      <span
                        className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 bg-slate-900 flex-shrink-0 shadow-sm"
                        title="Linked child page"
                      />
                    )}

                    {/* Bottom connecting line */}
                    {!isLast ? (
                      <div className="w-0.5 flex-1 bg-amber-500/60 min-h-[14px]" />
                    ) : (
                      <div className="w-0.5 flex-1" />
                    )}
                  </div>

                  {/* Bookmark Node Card */}
                  <div className="flex-1 min-w-0 bg-[#161616] border border-slate-700/70 rounded-lg p-2.5 hover:border-amber-500/50 transition-colors space-y-1 mb-2.5 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <a
                        href={bm.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-slate-100 hover:text-amber-300 transition-colors text-[12px] line-clamp-2 leading-snug flex-1"
                        title={bm.title}
                      >
                        {bm.title}
                      </a>

                      <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} title={`Status: ${bm.health}`} />
                        <a
                          href={bm.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-amber-300 p-0.5 transition-colors"
                          title="Open in new tab"
                        >
                          ↗
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="font-mono text-slate-300 truncate max-w-[210px] bg-black/50 px-1 py-0.5 rounded border border-white/5" title={path}>
                        {path}
                      </span>

                      <div className="flex items-center gap-2">
                        {!node.isRoot && (
                          <button
                            onClick={e => { e.stopPropagation(); onUnlink(bm.id) }}
                            className="text-slate-400 hover:text-red-400 transition-colors font-medium text-[10px] px-1.5 py-0.5 rounded hover:bg-red-500/10"
                            title="Unlink from parent"
                          >
                            Unlink
                          </button>
                        )}
                        {onEdit && (
                          <button
                            onClick={e => { e.stopPropagation(); onEdit(bm) }}
                            className="text-slate-300 hover:text-amber-300 transition-colors font-medium text-[10px] px-1.5 py-0.5 rounded hover:bg-white/5"
                            title="Edit bookmark note"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {/* "Opened from <parent>" hint */}
                    {node.parent && (
                      <div className="text-[10px] text-amber-400/90 flex items-center gap-1 pt-0.5 truncate border-t border-white/5 mt-1">
                        <span>↳ Opened from:</span>
                        <span className="font-medium text-slate-200 truncate" title={node.parent.title}>
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
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all"
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
