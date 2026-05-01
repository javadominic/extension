import type { BrainBookmark, GraphNode, GraphEdge, BookmarkCluster, GraphData } from '../types'

// ─── Cluster colour palette ───────────────────────────────────────────────────
const CLUSTER_COLORS = [
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#10b981', // emerald
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

  // 1. Count how often each tag appears
  const tagCount: Record<string, number> = {}
  for (const bm of bookmarks) {
    for (const tag of bm.tags) {
      tagCount[tag] = (tagCount[tag] ?? 0) + 1
    }
  }

  // 2. Assign each bookmark to the cluster of its most-common tag
  //    Bookmarks with no tags go into an "untagged" cluster.
  const clusterMap: Record<string, string[]> = {}  // clusterId → bookmarkIds

  for (const bm of bookmarks) {
    const sorted = [...bm.tags].sort((a, b) => (tagCount[b] ?? 0) - (tagCount[a] ?? 0))
    const clusterId = sorted[0] ?? 'untagged'
    if (!clusterMap[clusterId]) clusterMap[clusterId] = []
    clusterMap[clusterId].push(bm.id)
  }

  // 3. Build clusters (sorted by size desc so top clusters get prominent colours)
  const clusterIds = Object.keys(clusterMap).sort(
    (a, b) => clusterMap[b].length - clusterMap[a].length,
  )

  const clusters: BookmarkCluster[] = clusterIds.map((id, i) => ({
    id,
    label: id === 'untagged' ? 'Other' : id,
    color: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
    nodeIds: clusterMap[id],
  }))

  const clusterById: Record<string, BookmarkCluster> = {}
  for (const c of clusters) clusterById[c.id] = c

  // 4. Build edges — bookmarks sharing ≥1 tag
  const edges: GraphEdge[] = []
  for (let i = 0; i < bookmarks.length; i++) {
    for (let j = i + 1; j < bookmarks.length; j++) {
      const shared = bookmarks[i].tags.filter(t => bookmarks[j].tags.includes(t))
      if (shared.length > 0) {
        edges.push({ source: bookmarks[i].id, target: bookmarks[j].id, sharedTags: shared })
      }
    }
  }

  // 5. Count connections per node (for radius sizing)
  const degree: Record<string, number> = {}
  for (const e of edges) {
    degree[e.source] = (degree[e.source] ?? 0) + 1
    degree[e.target] = (degree[e.target] ?? 0) + 1
  }

  // 6. Initialise node positions — clustered radially around cluster centres
  const cx = width / 2
  const cy = height / 2
  const clusterAngleStep = (2 * Math.PI) / clusterIds.length
  const clusterRadius = Math.min(width, height) * 0.30

  const nodes: GraphNode[] = bookmarks.map(bm => {
    const clusterId = getClusterId(bm, tagCount)
    const cIdx = clusterIds.indexOf(clusterId)
    const cAngle = cIdx * clusterAngleStep
    // Position within cluster (random spread)
    const angle = cAngle + (Math.random() - 0.5) * clusterAngleStep * 0.9
    const r = clusterRadius * (0.35 + Math.random() * 0.55)
    const connections = degree[bm.id] ?? 0
    return {
      id: bm.id,
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      radius: 6 + Math.min(connections * 2, 8),   // 6–14 px
      clusterId,
      bookmark: bm,
    }
  })

  // 7. Force-directed relaxation (20 iterations, pure math)
  const nodeById: Record<string, GraphNode> = {}
  for (const n of nodes) nodeById[n.id] = n

  const edgeSet = new Set(edges.map(e => `${e.source}:${e.target}`))

  for (let iter = 0; iter < 20; iter++) {
    // Repulsion between all node pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const minDist = (a.radius + b.radius) * 3.5
        if (dist < minDist) {
          const force = (minDist - dist) / dist * 0.35
          a.x -= dx * force
          a.y -= dy * force
          b.x += dx * force
          b.y += dy * force
        }
      }
    }

    // Attraction along edges
    for (const e of edges) {
      const a = nodeById[e.source]
      const b = nodeById[e.target]
      if (!a || !b) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const target = 80   // desired edge length px
      if (dist > target) {
        const force = (dist - target) / dist * 0.12
        a.x += dx * force
        a.y += dy * force
        b.x -= dx * force
        b.y -= dy * force
      }
    }

    // Centre gravity — pull all nodes towards centre
    for (const n of nodes) {
      n.x += (cx - n.x) * 0.02
      n.y += (cy - n.y) * 0.02
    }
  }

  // 8. Clamp nodes within bounds
  const pad = 20
  for (const n of nodes) {
    n.x = Math.max(pad + n.radius, Math.min(width - pad - n.radius, n.x))
    n.y = Math.max(pad + n.radius, Math.min(height - pad - n.radius, n.y))
  }

  // Suppress unused variable warning
  void edgeSet

  return { nodes, edges, clusters, width, height }
}

function getClusterId(bm: BrainBookmark, tagCount: Record<string, number>): string {
  const sorted = [...bm.tags].sort((a, b) => (tagCount[b] ?? 0) - (tagCount[a] ?? 0))
  return sorted[0] ?? 'untagged'
}
