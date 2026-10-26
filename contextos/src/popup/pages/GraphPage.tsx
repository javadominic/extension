import { useState, useEffect } from 'react'
import GraphView from '../../components/GraphView'
import { getCachedBookmarks } from '../../lib/storage'
import { buildGraph } from '../../lib/graph'
import type { GraphData, GraphNode, BookmarkCluster } from '../../types'
import graphIcon from '../../assets/icons/tab-graph.png'

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
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Building graph…</span>
        </div>
      </div>
    )
  }

  if (bookmarkCount < 3) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
        <img src={graphIcon} alt="Knowledge graph" className="w-16 h-16 object-contain drop-shadow-lg animate-float" />
        <div>
          <p className="text-sm font-semibold text-slate-300">Not enough bookmarks yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Save at least 3 bookmarks to see your knowledge graph.
            The more you save, the richer the connections.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-600 mt-2">
          <div className="w-2 h-2 rounded-full bg-violet-500" />
          <span>Nodes = bookmarks</span>
          <div className="w-2 h-2 rounded-full bg-cyan-500" />
          <span>Colors = topic clusters</span>
        </div>
      </div>
    )
  }

  if (!graphData) return null

  const { clusters } = graphData

  function handleNodeSelect(node: GraphNode) {
    // Could navigate to the bookmark in the Saves tab in the future
    console.log('[GraphPage] selected node', node.id)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Legend strip */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-surface-border overflow-x-auto">
        <span className="text-[10px] text-slate-500 font-medium flex-shrink-0">Clusters:</span>
        {clusters.slice(0, 8).map((c: BookmarkCluster) => (
          <div
            key={c.id}
            className="flex items-center gap-1 flex-shrink-0"
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: c.color }}
            />
            <span className="text-[10px] text-slate-400 capitalize whitespace-nowrap">
              {c.label} ({c.nodeIds.length})
            </span>
          </div>
        ))}
        {clusters.length > 8 && (
          <span className="text-[10px] text-slate-600 flex-shrink-0">
            +{clusters.length - 8} more
          </span>
        )}
      </div>

      {/* Hint */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-1.5 bg-slate-900/40">
        <span className="text-[9px] text-slate-600">Click a node · Scroll to zoom · Drag to pan</span>
        <span className="text-[9px] text-slate-600">{graphData.nodes.length} bookmarks · {graphData.edges.length} connections</span>
      </div>

      {/* Graph canvas area */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.06) 0%, rgba(15,23,42,0) 70%)',
        }}
      >
        <GraphView data={graphData} onSelectNode={handleNodeSelect} />
      </div>
    </div>
  )
}
