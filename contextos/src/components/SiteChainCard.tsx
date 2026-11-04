import { useState } from 'react'
import type { BrainBookmark } from '../types'
import type { SiteGroup, SiteChainNode } from '../lib/chains'
import {
  IconLink2,
  IconNetwork,
  IconExternalLink,
  IconPlus,
  IconChevronDown,
} from './LucideIcons'

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
  alive:     'bg-live',
  dead:      'bg-dead',
  unchecked: 'bg-text-muted',
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
    <div className={`surface-card transition-colors duration-fast overflow-hidden ${expanded ? 'border-border-control' : 'hover:border-border-control'}`}>
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
              className="w-4 h-4 rounded flex-shrink-0"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium truncate">
                {isGitHubRepo ? (
                  <>
                    <span className="text-text-muted font-normal">{owner}/</span>
                    <span className="text-text font-medium">{repo}</span>
                  </>
                ) : (
                  <span className="text-text font-medium">{group.domainKey}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="chip-neutral text-[11px] gap-1 font-mono">
              <IconLink2 size={12} strokeWidth={1.5} />
              <span>{group.totalCount} linked</span>
            </span>

            <button
              type="button"
              className="text-text-muted hover:text-text p-1 rounded cursor-pointer transition-transform duration-fast"
              title={expanded ? 'Collapse chain' : 'Expand chain'}
            >
              <IconChevronDown
                size={14}
                strokeWidth={1.5}
                className={`transition-transform duration-fast ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* ── Breadcrumb path summary ───────────────────────────────── */}
        <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto no-scrollbar pt-0.5">
          {group.breadcrumbs.map((seg, idx) => (
            <span key={idx} className="flex items-center gap-1 flex-shrink-0 font-mono">
              {idx > 0 && <span className="text-text-muted text-[10px]">/</span>}
              <span className={`px-1.5 py-0.5 rounded text-[10px] border ${
                idx === 0
                  ? 'bg-amber-soft text-amber-text border-amber/30 font-medium'
                  : 'bg-surface-raised text-text-secondary border-border'
              }`}>
                {seg}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Expanded Chain ───────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-border bg-surface-raised/40 p-3.5 space-y-3">
          {/* Action toolbar */}
          <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-border text-xs">
            <button
              onClick={e => { e.stopPropagation(); onOpenAll(group) }}
              className="btn-secondary text-xs py-1 px-2.5 min-h-[30px]"
              title="Open all pages in new tabs"
            >
              <IconExternalLink size={12} strokeWidth={1.5} />
              <span>Open all ({group.totalCount})</span>
            </button>

            <button
              onClick={e => { e.stopPropagation(); onAddToChain(group) }}
              className="btn-secondary text-xs py-1 px-2.5 min-h-[30px]"
              title="Add a page to this chain"
            >
              <IconPlus size={12} strokeWidth={2} />
              <span>Add to chain</span>
            </button>

            <button
              onClick={e => { e.stopPropagation(); onShowInGraph(group) }}
              className="btn-ghost text-xs py-1 px-2.5 min-h-[30px] ml-auto"
              title="View this chain and domain in Graph tab"
            >
              <IconNetwork size={12} strokeWidth={1.5} />
              <span>Graph</span>
            </button>
          </div>

          {/* Vertical Chain Visualization */}
          <div className="space-y-0 py-1">
            {visibleNodes.map((node: SiteChainNode, idx: number) => {
              const bm = node.bookmark
              const path = parsePathname(bm.url)
              const statusDot = HEALTH_DOT[bm.health] ?? 'bg-text-muted'
              const isFirst = idx === 0
              const isLast = idx === visibleNodes.length - 1

              return (
                <div key={bm.id} className="relative flex items-stretch gap-2.5 text-xs group/node">
                  {/* Timeline Column */}
                  <div className="relative flex flex-col items-center flex-shrink-0 w-5">
                    {/* Top connecting line */}
                    {isFirst ? (
                      <div className="w-px h-3.5" />
                    ) : (
                      <div className="w-px h-3.5 bg-border-control" />
                    )}

                    {/* Node Circle */}
                    {node.isRoot ? (
                      <span
                        className="w-2.5 h-2.5 rounded-full bg-amber ring-2 ring-amber/20 flex-shrink-0"
                        title="Root page"
                      />
                    ) : (
                      <span
                        className="w-2 h-2 rounded-full border border-amber bg-surface flex-shrink-0"
                        title="Child page"
                      />
                    )}

                    {/* Bottom connecting line */}
                    {!isLast ? (
                      <div className="w-px flex-1 bg-border-control min-h-[14px]" />
                    ) : (
                      <div className="w-px flex-1" />
                    )}
                  </div>

                  {/* Bookmark Node Card */}
                  <div className="flex-1 min-w-0 surface-card p-2.5 hover:border-border-control transition-colors duration-fast space-y-1 mb-2">
                    <div className="flex items-start justify-between gap-2">
                      <a
                        href={bm.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-text hover:text-amber-text transition-colors text-xs line-clamp-2 leading-snug flex-1"
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
                          className="text-text-muted hover:text-text p-0.5 transition-colors"
                          title="Open in new tab"
                        >
                          <IconExternalLink size={12} strokeWidth={1.5} />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="font-mono text-text-muted truncate max-w-[210px]" title={path}>
                        {path}
                      </span>

                      <div className="flex items-center gap-2">
                        {!node.isRoot && (
                          <button
                            onClick={e => { e.stopPropagation(); onUnlink(bm.id) }}
                            className="text-text-muted hover:text-danger transition-colors cursor-pointer text-[11px]"
                            title="Unlink from parent"
                          >
                            Unlink
                          </button>
                        )}
                        {onEdit && (
                          <button
                            onClick={e => { e.stopPropagation(); onEdit(bm) }}
                            className="text-text-muted hover:text-amber transition-colors cursor-pointer text-[11px]"
                            title="Edit bookmark note"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {/* "Opened from <parent>" hint */}
                    {node.parent && (
                      <div className="text-[10px] text-text-muted flex items-center gap-1 pt-0.5 truncate border-t border-border mt-1">
                        <span className="text-amber-text">From:</span>
                        <span className="text-text-secondary truncate" title={node.parent.title}>
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
                className="chip-neutral text-xs px-3 py-1 cursor-pointer"
              >
                {showAllNodes ? 'Show fewer' : `Show ${hiddenCount} more saves in chain`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
