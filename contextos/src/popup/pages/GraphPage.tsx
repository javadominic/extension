import { useState, useEffect } from 'react'
import GraphView from '../../components/GraphView'
import { getCachedBookmarks } from '../../lib/storage'
import { buildGraph } from '../../lib/graph'
import type { GraphData, GraphNode, BookmarkCluster } from '../../types'
import { IconNetwork } from '../../components/LucideIcons'

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [bookmarkCount, setBookmarkCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCachedBookmarks().then(bookmarks => {
      setBookmarkCount(bookmarks.length)
      if (bookmarks.length >= 3) {
        setGraphData(buildGraph(bookmarks, 560, 420))
      }
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-text-muted">
          <div className="w-6 h-6 border-2 border-amber border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Building graph…</span>
        </div>
      </div>
    )
  }

  if (bookmarkCount < 3) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center py-12">
        <div className="w-12 h-12 rounded-full bg-surface-raised border border-border flex items-center justify-center text-text-muted mb-1">
          <IconNetwork size={22} strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm font-medium text-text">Not enough saves yet</p>
          <p className="text-xs text-text-muted mt-1 leading-relaxed max-w-xs">
            Save at least 3 pages to view topic relationships and domain clusters in a graph.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-muted mt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber" />
            <span>Saves</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-text-secondary" />
            <span>Topics</span>
          </div>
        </div>
      </div>
    )
  }

  if (!graphData) return null

  const { clusters } = graphData

  function handleNodeSelect(node: GraphNode) {
    console.log('[GraphPage] selected node', node.id)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg">
      {/* Legend strip */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border bg-surface overflow-x-auto no-scrollbar">
        <span className="text-[11px] text-text-muted font-medium flex-shrink-0">Clusters:</span>
        {clusters.slice(0, 8).map((c: BookmarkCluster) => (
          <div
            key={c.id}
            className="flex items-center gap-1.5 flex-shrink-0"
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: c.color }}
            />
            <span className="text-[11px] text-text-secondary capitalize whitespace-nowrap">
              {c.label} <span className="text-text-muted font-mono">({c.nodeIds.length})</span>
            </span>
          </div>
        ))}
        {clusters.length > 8 && (
          <span className="text-[11px] text-text-muted flex-shrink-0">
            +{clusters.length - 8} more
          </span>
        )}
      </div>

      {/* Hint */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-1.5 bg-surface-raised border-b border-border text-[10px] text-text-muted">
        <span>Click node to inspect · Scroll to zoom · Drag to pan</span>
        <span className="tabular-nums">{graphData.nodes.length} saves · {graphData.edges.length} connections</span>
      </div>

      {/* Graph canvas area */}
      <div className="flex-1 overflow-hidden relative bg-bg">
        <GraphView data={graphData} onSelectNode={handleNodeSelect} />
      </div>
    </div>
  )
}
