import type { BrainBookmark } from '../types'
import { getCachedBookmarks, upsertBookmark, getSettings } from './storage'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'

/**
 * Extracts the grouping key for a URL:
 * - For github.com, returns "owner/repo" if available.
 * - Otherwise returns the hostname without leading "www.".
 */
export function getDomainKey(url: string): string {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase().replace(/^www\./, '')
    if (host === 'github.com') {
      const parts = u.pathname.split('/').filter(Boolean)
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`.toLowerCase()
      }
    }
    return host || url
  } catch {
    return url
  }
}

/**
 * Extracts the base hostname for favicon and network checks.
 */
export function getHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

/**
 * Extracts clean breadcrumb path segments from a URL.
 * e.g. "https://example.com/docs/guides/intro" -> ["/", "docs", "guides", "intro"]
 */
export function getPathSegments(url: string): string[] {
  try {
    const u = new URL(url)
    const rawSegments = u.pathname.split('/').filter(Boolean)
    if (rawSegments.length === 0) return ['/']
    return ['/', ...rawSegments.map(s => decodeURIComponent(s).replace(/\.html?$/, ''))]
  } catch {
    return ['/']
  }
}

/**
 * Merges breadcrumbs across multiple URLs in a group into a representative summary.
 */
export function getMergedBreadcrumbs(bookmarks: BrainBookmark[]): string[] {
  if (bookmarks.length === 0) return ['/']
  const segmentSets = bookmarks.map(b => getPathSegments(b.url))
  // Find common root segments or take the unique distinct top-level paths
  const uniquePaths = new Set<string>()
  for (const segs of segmentSets) {
    if (segs.length <= 1) {
      uniquePaths.add('/')
    } else {
      for (let i = 1; i < Math.min(segs.length, 4); i++) {
        uniquePaths.add(segs[i])
      }
    }
  }
  const res = Array.from(uniquePaths).slice(0, 5)
  if (!res.includes('/')) res.unshift('/')
  return res
}

export interface SiteChainNode {
  bookmark: BrainBookmark
  parent?: BrainBookmark
  depth: number
  isRoot: boolean
}

export interface SiteGroup {
  domainKey: string
  domain: string
  favicon: string
  bookmarks: BrainBookmark[]
  breadcrumbs: string[]
  nodes: SiteChainNode[]
  totalCount: number
}

/**
 * Builds SiteGroups from a list of bookmarks, organizing them into chains.
 */
export function groupBookmarksBySite(bookmarks: BrainBookmark[]): SiteGroup[] {
  const groupsMap = new Map<string, BrainBookmark[]>()

  for (const bm of bookmarks) {
    const key = bm.domainKey || getDomainKey(bm.url)
    const list = groupsMap.get(key) ?? []
    list.push({ ...bm, domainKey: key })
    groupsMap.set(key, list)
  }

  const result: SiteGroup[] = []

  for (const [domainKey, bms] of groupsMap.entries()) {
    const bmById = new Map<string, BrainBookmark>()
    for (const b of bms) bmById.set(b.id, b)

    // Identify roots: bookmarks with no parentId OR parent not in this group
    const childrenMap = new Map<string, BrainBookmark[]>()
    const roots: BrainBookmark[] = []

    for (const b of bms) {
      if (b.parentId && bmById.has(b.parentId)) {
        const list = childrenMap.get(b.parentId) ?? []
        list.push(b)
        childrenMap.set(b.parentId, list)
      } else {
        roots.push(b)
      }
    }

    // Sort roots newest first
    roots.sort((a, b) => b.addedAt - a.addedAt)

    // Traverse in tree order
    const orderedNodes: SiteChainNode[] = []
    const visited = new Set<string>()

    function traverse(node: BrainBookmark, depth: number, parent?: BrainBookmark) {
      if (visited.has(node.id)) return
      visited.add(node.id)
      orderedNodes.push({
        bookmark: node,
        parent,
        depth,
        isRoot: depth === 0,
      })
      const children = childrenMap.get(node.id) ?? []
      children.sort((a, b) => b.addedAt - a.addedAt)
      for (const child of children) {
        traverse(child, depth + 1, node)
      }
    }

    for (const root of roots) {
      traverse(root, 0)
    }

    // Any remaining bookmarks (e.g. cycle safeguard)
    for (const b of bms) {
      if (!visited.has(b.id)) {
        traverse(b, 0)
      }
    }

    const domain = getHostname(bms[0].url) || domainKey
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    const breadcrumbs = getMergedBreadcrumbs(bms)

    result.push({
      domainKey,
      domain,
      favicon,
      bookmarks: bms,
      breadcrumbs,
      nodes: orderedNodes,
      totalCount: bms.length,
    })
  }

  // Sort groups by newest bookmark inside
  result.sort((a, b) => {
    const aNewest = Math.max(...a.bookmarks.map(x => x.addedAt), 0)
    const bNewest = Math.max(...b.bookmarks.map(x => x.addedAt), 0)
    return bNewest - aNewest
  })

  return result
}

/**
 * Calculates how many bookmarks are in the same chain/domainKey for a given bookmark.
 */
export function getChainLength(bookmarkId: string, allBookmarks: BrainBookmark[]): number {
  const target = allBookmarks.find(b => b.id === bookmarkId)
  if (!target) return 1
  const key = target.domainKey || getDomainKey(target.url)
  return allBookmarks.filter(b => (b.domainKey || getDomainKey(b.url)) === key).length
}

/**
 * Attempts to detect the parent bookmark for a newly saved page.
 */
export async function detectParentBookmark(
  targetUrl: string,
  openerTabId?: number,
  referrer?: string,
  allowCrossSite = false
): Promise<string | null> {
  const cached = await getCachedBookmarks()
  if (cached.length === 0) return null

  const targetDomainKey = getDomainKey(targetUrl)

  function normalize(u: string): string {
    try {
      const parsed = new URL(u)
      return (parsed.origin + parsed.pathname).replace(/\/$/, '').toLowerCase()
    } catch {
      return u.toLowerCase().replace(/\/$/, '')
    }
  }

  const candidateUrls: string[] = []

  // 1. Check opener tab
  if (typeof openerTabId === 'number' && openerTabId > 0) {
    try {
      const opener = await chrome.tabs.get(openerTabId)
      if (opener?.url) candidateUrls.push(opener.url)
    } catch { /* opener tab closed or inaccessible */ }
  }

  // 2. Check referrer
  if (referrer && referrer.startsWith('http')) {
    candidateUrls.push(referrer)
  }

  if (candidateUrls.length === 0) return null

  for (const candUrl of candidateUrls) {
    const normCand = normalize(candUrl)
    const match = cached.find(b => normalize(b.url) === normCand)
    if (match) {
      if (!allowCrossSite) {
        const candDomainKey = match.domainKey || getDomainKey(match.url)
        if (candDomainKey !== targetDomainKey) continue
      }
      return match.id
    }
  }

  return null
}

/**
 * Unlinks a bookmark from its parent.
 */
export async function unlinkBookmark(id: string, uid?: string): Promise<void> {
  const cache = await getCachedBookmarks()
  const bm = cache.find(b => b.id === id)
  if (!bm) return
  bm.parentId = null
  await upsertBookmark(bm)
  if (uid) {
    try {
      const ref = doc(db, 'bookmarks', uid, 'items', id)
      await updateDoc(ref, { parentId: null })
    } catch {}
  }
}

/**
 * Links a child bookmark to a specified parent bookmark.
 */
export async function linkBookmark(childId: string, parentId: string, uid?: string): Promise<void> {
  const cache = await getCachedBookmarks()
  const child = cache.find(b => b.id === childId)
  if (!child) return
  child.parentId = parentId
  await upsertBookmark(child)
  if (uid) {
    try {
      const ref = doc(db, 'bookmarks', uid, 'items', childId)
      await updateDoc(ref, { parentId })
    } catch {}
  }
}
