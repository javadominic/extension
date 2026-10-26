import type { BrainBookmark, GraphNode, GraphEdge, BookmarkCluster, GraphData } from '../types'
import { getDomainKey } from './chains'

// ─── Cluster colour palette ───────────────────────────────────────────────────
const CLUSTER_COLORS = [
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#f43f5e', // rose
  '#3b82f6', // blue
  '#ec4899', // pink
  '#84cc16', // lime
  '#a78bfa', // purple-light
  '#fb923c', // orange
]

// ─── Main entry point ─────────────────────────────────────────────────────────
export function buildGraph(
  bookmarks: BrainBookmark[],
  width = 560,
  height = 460,
): GraphData {
  if (bookmarks.length === 0) return { nodes: [], edges: [], clusters: [], width, height }

  // 1. Cluster bookmarks by domainKey (Domain Clusters)
  const clusterMap: Record<string, string[]> = {} // domainKey → bookmarkIds

  for (const bm of bookmarks) {
    const key = bm.domainKey || getDomainKey(bm.url)
    if (!clusterMap[key]) clusterMap[key] = []
    clusterMap[key].push(bm.id)
  }

  // 2. Build clusters (sorted by size desc so top domains get prominent colours)
  const clusterIds = Object.keys(clusterMap).sort(
    (a, b) => clusterMap[b].length - clusterMap[a].length,
  )

  const clusters: BookmarkCluster[] = clusterIds.map((id, i) => ({
    id,
    label: id,
    color: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
    nodeIds: clusterMap[id],
  }))

  // 3. Build edges:
  // First, parent-to-child chain edges (directed site chains)
  const edges: GraphEdge[] = []
  const bmById = new Map<string, BrainBookmark>()
  for (const b of bookmarks) bmById.set(b.id, b)

  for (const bm of bookmarks) {
    if (bm.parentId && bmById.has(bm.parentId)) {
      edges.push({
        source: bm.parentId,
        target: bm.id,
        type: 'chain',
      })
    }
  }

  // Second, shared tags edges for bookmarks that share tags
  for (let i = 0; i < bookmarks.length; i++) {
    for (let j = i + 1; j < bookmarks.length; j++) {
      const alreadyConnected = edges.some(e =>
        (e.source === bookmarks[i].id && e.target === bookmarks[j].id) ||
        (e.source === bookmarks[j].id && e.target === bookmarks[i].id)
      )
      if (!alreadyConnected) {
        const shared = bookmarks[i].tags.filter(t => bookmarks[j].tags.includes(t))
        if (shared.length > 0) {
          edges.push({
            source: bookmarks[i].id,
            target: bookmarks[j].id,
            sharedTags: shared,
            type: 'tag',
          })
        }
      }
    }
  }

  // 4. Count connections per node (for radius sizing)
  const degree: Record<string, number> = {}
  for (const e of edges) {
    degree[e.source] = (degree[e.source] ?? 0) + 1
    degree[e.target] = (degree[e.target] ?? 0) + 1
  }

  // 5. Initialise node positions — clustered radially around domain cluster centres
  const cx = width / 2
  const cy = height / 2
  const clusterAngleStep = (2 * Math.PI) / Math.max(clusterIds.length, 1)
  const clusterRadius = Math.min(width, height) * 0.30

  const nodes: GraphNode[] = bookmarks.map(bm => {
    const clusterId = bm.domainKey || getDomainKey(bm.url)
    const cIdx = clusterIds.indexOf(clusterId)
    const cAngle = cIdx * clusterAngleStep
    // Position within cluster
    const angle = cAngle + (Math.random() - 0.5) * clusterAngleStep * 0.9
    const r = clusterRadius * (0.35 + Math.random() * 0.55)
    const connections = degree[bm.id] ?? 0
    return {
      id: bm.id,
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      radius: bm.parentId ? 7 : (connections > 0 ? 9 : 6),
      clusterId,
      bookmark: bm,
    }
  })

  // 6. Force-directed relaxation (25 iterations)
  const nodeById: Record<string, GraphNode> = {}
  for (const n of nodes) nodeById[n.id] = n

  for (let iter = 0; iter < 25; iter++) {
    // Repulsion between all node pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const minDist = (a.radius + b.radius) * 3.2
        if (dist < minDist) {
          const force = ((minDist - dist) / dist) * 0.35
          a.x -= dx * force
          a.y -= dy * force
          b.x += dx * force
          b.y += dy * force
        }
      }
    }

    // Attraction along edges (chain edges pull tighter than tag edges)
    for (const e of edges) {
      const a = nodeById[e.source]
      const b = nodeById[e.target]
      if (!a || !b) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const target = e.type === 'chain' ? 50 : 80
      if (dist > target) {
        const strength = e.type === 'chain' ? 0.22 : 0.10
        const force = ((dist - target) / dist) * strength
        a.x += dx * force
        a.y += dy * force
        b.x -= dx * force
        b.y -= dy * force
      }
    }

    // Centre gravity
    for (const n of nodes) {
      n.x += (cx - n.x) * 0.02
      n.y += (cy - n.y) * 0.02
    }
  }

  // 7. Clamp nodes within bounds
  const pad = 24
  for (const n of nodes) {
    n.x = Math.max(pad + n.radius, Math.min(width - pad - n.radius, n.x))
    n.y = Math.max(pad + n.radius, Math.min(height - pad - n.radius, n.y))
  }

  return { nodes, edges, clusters, width, height }
}
