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
          {/* Cluster halo gradient per cluster */}
          {clusters.map((c: BookmarkCluster) => (
            <radialGradient key={c.id} id={`halo-${c.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={c.color} stopOpacity="0.06" />
              <stop offset="100%" stopColor={c.color} stopOpacity="0" />
            </radialGradient>
          ))}

          {/* Directed chain arrow marker */}
          <marker id="chain-arrow" viewBox="0 0 10 10" refX="16" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#E5A53A" />
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
                stroke={isChain ? '#E5A53A' : (isHighlighted ? clusterColor[src.clusterId] ?? 'var(--text-secondary)' : 'var(--border)')}
                strokeWidth={isChain ? (isHighlighted ? 2 : 1.5) : (isHighlighted ? 1.5 : 1)}
                strokeOpacity={isChain ? 0.9 : (isHighlighted ? 0.7 : 0.4)}
                markerEnd={isChain ? 'url(#chain-arrow)' : undefined}
              />
            )
          })}

          {/* ── Nodes ── */}
          {nodes.map((n: GraphNode) => {
            const color = clusterColor[n.clusterId] ?? '#E5A53A'
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
                {/* Active selection ring */}
                {active && (
                  <circle
                    cx={n.x} cy={n.y}
                    r={n.radius + 3.5}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    strokeOpacity={0.8}
                  />
                )}

                {/* Main node circle */}
                <circle
                  cx={n.x} cy={n.y}
                  r={n.radius}
                  fill={color}
                  fillOpacity={active ? 1 : 0.8}
                  stroke={active ? 'var(--text)' : 'var(--bg)'}
                  strokeWidth={active ? 1.5 : 1}
                />

                {/* Label */}
                {(active || n.radius >= 11) && (
                  <text
                    x={n.x}
                    y={n.y + n.radius + 10}
                    textAnchor="middle"
                    fontSize="8"
                    fill="var(--text-secondary)"
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
          className="absolute bottom-3 left-3 right-3 surface-card p-3 space-y-1.5 z-20 shadow-lg border border-border rounded-btn"
          style={{ maxHeight: '140px' }}
        >
          <div className="flex items-start gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0"
              style={{ background: clusterColor[selectedNode.clusterId] ?? 'var(--amber)' }}
            />
            <p className="text-xs font-medium text-text leading-tight line-clamp-2 flex-1">
              {selectedNode.bookmark.title}
            </p>
            <button
              onClick={() => setSelectedId(null)}
              className="text-text-muted hover:text-text text-xs flex-shrink-0 p-0.5 cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {selectedNode.bookmark.note && (
            <p className="text-[11px] text-text-secondary line-clamp-2 pl-4">
              {selectedNode.bookmark.note}
            </p>
          )}

          {selectedNode.bookmark.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pl-4">
              {selectedNode.bookmark.tags.slice(0, 4).map(t => (
                <span key={t} className="chip-neutral text-[10px] py-0.5 px-1.5">
                  #{t}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 pl-4 pt-0.5">
            <a
              href={selectedNode.bookmark.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-amber-text hover:underline font-medium"
            >
              Open link
            </a>
            <span className="text-text-muted text-[10px] tabular-nums">
              {new Date(selectedNode.bookmark.addedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
