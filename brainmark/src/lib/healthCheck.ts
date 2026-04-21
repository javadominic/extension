// ============================================================
// BrainMark — Link Health Checker
// ============================================================
import { doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import {
  getHealthStatus,
  setHealthStatus,
  getBookmarksCache,
  setBookmarksCache,
} from './storage'
import type { BrainBookmark } from '../types'

const BATCH_SIZE = 5

export async function checkUrl(url: string): Promise<'alive' | 'dead'> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    })
    return res.ok ? 'alive' : 'dead'
  } catch {
    return 'dead'
  }
}

export async function checkAllBookmarks(
  bookmarks: BrainBookmark[],
  uid?: string
): Promise<void> {
  const healthMap = await getHealthStatus()
  const cache = await getBookmarksCache()
  const now = Date.now()

  for (let i = 0; i < bookmarks.length; i += BATCH_SIZE) {
    const batch = bookmarks.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (bm) => {
        const status = await checkUrl(bm.url)
        healthMap[bm.url] = status

        // Update cache entry
        const cacheEntry = cache.find((b) => b.id === bm.id)
        if (cacheEntry) {
          cacheEntry.health = status
          cacheEntry.lastChecked = now
        }

        // Update Firestore if signed in
        if (uid) {
          try {
            const ref = doc(db, 'bookmarks', uid, 'items', bm.id)
            await updateDoc(ref, { health: status, lastChecked: now })
          } catch {
            // Non-critical; continue
          }
        }
      })
    )

    // Persist health map to sync storage (per-batch)
    await setHealthStatus(healthMap)
  }

  await setBookmarksCache(cache)
}
