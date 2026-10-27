import { useRef, useState, useCallback, useEffect } from 'react'
import type { GraphData, GraphNode, GraphEdge, BookmarkCluster } from '../types'

interface Props {
  data: GraphData
  onSelectNode?: (node: GraphNode) => void
}

interface Viewport {
  x: number      // pan offset
  y: number
  scale: number  // zoom
}

export default function GraphView({ data, onSelectNode }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 })
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  const { nodes, edges, clusters, width, height } = data

  // Build lookup maps
  const nodeById: Record<string, GraphNode> = {}
  for (const n of nodes) nodeById[n.id] = n

  const clusterColor: Record<string, string> = {}
  for (const c of clusters) clusterColor[c.id] = c.color

  // ── Pan handlers ──────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as SVGElement).closest('.graph-node')) return
    dragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    setViewport(v => ({ ...v, x: v.x + dx, y: v.y + dy }))
  }, [])

  const stopDrag = useCallback(() => { dragging.current = false }, [])

  // ── Zoom on scroll ────────────────────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    setViewport(v => ({
      ...v,
      scale: Math.max(0.4, Math.min(3, v.scale * factor)),
    }))
  }, [])

  // Close popover on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedId(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const selectedNode = selectedId ? nodeById[selectedId] : null

  // ── Cluster halo centres ──────────────────────────────────────────────────
  const clusterCentres: Record<string, { x: number; y: number; r: number }> = {}
  for (const c of clusters) {
    const pts = c.nodeIds.map((id: string) => nodeById[id]).filter((n): n is GraphNode => Boolean(n))
    if (!pts.length) continue
    const cx = pts.reduce((s: number, n: GraphNode) => s + n.x, 0) / pts.length
    const cy = pts.reduce((s: number, n: GraphNode) => s + n.y, 0) / pts.length
    const maxR = Math.max(...pts.map((n: GraphNode) => Math.hypot(n.x - cx, n.y - cy))) + 28
    clusterCentres[c.id] = { x: cx, y: cy, r: Math.max(maxR, 35) }
  }

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onWheel={onWheel}
        style={{ background: 'transparent' }}
      >
        <defs>
          {/* Glow filter for hovered / selected nodes */}
          <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Cluster halo gradient per cluster */}
          {clusters.map((c: BookmarkCluster) => (
            <radialGradient key={c.id} id={`halo-${c.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={c.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={c.color} stopOpacity="0" />
            </radialGradient>
          ))}

          {/* Directed chain arrow marker */}
          <marker id="chain-arrow" viewBox="0 0 10 10" refX="16" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#e8a034" />
          </marker>
        </defs>

        <g transform={`translate(${viewport.x},${viewport.y}) scale(${viewport.scale})`}>
          {/* ── Cluster halos ── */}
          {clusters.map((c: BookmarkCluster) => {
            const centre = clusterCentres[c.id]
            if (!centre) return null
            return (
              <ellipse
                key={c.id}
                cx={centre.x}
                cy={centre.y}
                rx={centre.r}
                ry={centre.r * 0.82}
                fill={`url(#halo-${c.id})`}
              />
            )
          })}

          {/* ── Edges ── */}
          {edges.map((e: GraphEdge, i: number) => {
            const src = nodeById[e.source]
            const tgt = nodeById[e.target]
            if (!src || !tgt) return null
            const isHighlighted =
              hoveredId === e.source || hoveredId === e.target ||
              selectedId === e.source || selectedId === e.target
            const isChain = e.type === 'chain'
            return (
              <line
                key={i}
                x1={src.x} y1={src.y}
                x2={tgt.x} y2={tgt.y}
                stroke={isChain ? '#e8a034' : (isHighlighted ? clusterColor[src.clusterId] ?? '#6366f1' : '#334155')}
                strokeWidth={isChain ? (isHighlighted ? 2.5 : 2) : (isHighlighted ? 1.5 : 0.8)}
                strokeOpacity={isChain ? 0.95 : (isHighlighted ? 0.8 : 0.35)}
                markerEnd={isChain ? 'url(#chain-arrow)' : undefined}
              />
            )
          })}

          {/* ── Nodes ── */}
          {nodes.map((n: GraphNode) => {
            const color = clusterColor[n.clusterId] ?? '#6366f1'
            const isHovered = hoveredId === n.id
            const isSelected = selectedId === n.id
            const active = isHovered || isSelected
            return (
              <g
                key={n.id}
                className="graph-node"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => {
                  setSelectedId(prev => prev === n.id ? null : n.id)
                  onSelectNode?.(n)
                }}
              >
                {/* Outer glow ring when active */}
                {active && (
                  <circle
                    cx={n.x} cy={n.y}
                    r={n.radius + 5}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    strokeOpacity={0.5}
                    filter="url(#glow)"
                  />
                )}

                {/* Main node circle */}
                <circle
                  cx={n.x} cy={n.y}
                  r={n.radius}
                  fill={color}
                  fillOpacity={active ? 1 : 0.75}
                  stroke={active ? '#fff' : color}
                  strokeWidth={active ? 1.5 : 0}
                />

                {/* Label - always show for large nodes, on hover for others */}
                {(active || n.radius >= 11) && (
                  <text
                    x={n.x}
                    y={n.y + n.radius + 9}
                    textAnchor="middle"
                    fontSize="7.5"
                    fill="#cbd5e1"
                    fontFamily="inherit"
                    style={{ pointerEvents: 'none' }}
                  >
                    {n.bookmark.title.length > 22
                      ? n.bookmark.title.slice(0, 21) + '…'
                      : n.bookmark.title}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* ── Node detail popover ── */}
      {selectedNode && (
        <div
          className="absolute bottom-3 left-3 right-3 glass-card p-3 space-y-1.5 z-20 animate-fade-in"
          style={{ maxHeight: '140px' }}
        >
          <div className="flex items-start gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0"
              style={{ background: clusterColor[selectedNode.clusterId] ?? '#6366f1' }}
            />
            <p className="text-xs font-semibold text-slate-100 leading-tight line-clamp-2 flex-1">
              {selectedNode.bookmark.title}
            </p>
            <button
              onClick={() => setSelectedId(null)}
              className="text-slate-500 hover:text-slate-300 text-xs flex-shrink-0"
            >
              ✕
            </button>
          </div>

          {selectedNode.bookmark.note && (
            <p className="text-[10px] text-slate-400 line-clamp-2 pl-4">
              {selectedNode.bookmark.note}
            </p>
          )}

          {selectedNode.bookmark.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pl-4">
              {selectedNode.bookmark.tags.slice(0, 4).map(t => (
                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300">
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2 pl-4 pt-0.5">
            <a
              href={selectedNode.bookmark.url}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-primary-400 hover:text-primary-300 font-medium transition-colors"
            >
              Open ↗
            </a>
            <span className="text-slate-600 text-[10px]">
              {new Date(selectedNode.bookmark.addedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
