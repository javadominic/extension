// ============================================================
// BrainMark — chrome.storage Helpers
// ============================================================
import type { BrainBookmark, AppSettings } from '../types'

// ── SYNC (small, cross-device) ──────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get('settings', (result) => {
      resolve(
        (result.settings as AppSettings) ?? {
          geminiApiKey: '',
          toastEnabled: true,
          theme: 'system',
        }
      )
    })
  })
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ settings }, resolve)
  })
}

export async function getHealthStatus(): Promise<
  Record<string, 'alive' | 'dead' | 'unchecked'>
> {
  return new Promise((resolve) => {
    chrome.storage.sync.get('health_status', (result) => {
      resolve((result.health_status as Record<string, 'alive' | 'dead' | 'unchecked'>) ?? {})
    })
  })
}

export async function setHealthStatus(
  status: Record<string, 'alive' | 'dead' | 'unchecked'>
): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ health_status: status }, resolve)
  })
}

export async function getLastSync(): Promise<number> {
  return new Promise((resolve) => {
    chrome.storage.sync.get('last_sync', (result) => {
      resolve((result.last_sync as number) ?? 0)
    })
  })
}

export async function setLastSync(ts: number): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ last_sync: ts }, resolve)
  })
}

// ── LOCAL (large, this device only) ────────────────────────

export async function getBookmarksCache(): Promise<BrainBookmark[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get('bookmarks_cache', (result) => {
      resolve((result.bookmarks_cache as BrainBookmark[]) ?? [])
    })
  })
}

export async function setBookmarksCache(bookmarks: BrainBookmark[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ bookmarks_cache: bookmarks }, resolve)
  })
}

export async function upsertBookmarkInCache(bookmark: BrainBookmark): Promise<void> {
  const cache = await getBookmarksCache()
  const idx = cache.findIndex((b) => b.id === bookmark.id)
  if (idx >= 0) cache[idx] = bookmark
  else cache.unshift(bookmark)
  await setBookmarksCache(cache)
}

export async function removeBookmarkFromCache(id: string): Promise<void> {
  const cache = await getBookmarksCache()
  await setBookmarksCache(cache.filter((b) => b.id !== id))
}

export async function getPendingNotes(): Promise<BrainBookmark[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get('pending_notes', (result) => {
      resolve((result.pending_notes as BrainBookmark[]) ?? [])
    })
  })
}

export async function setPendingNotes(notes: BrainBookmark[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ pending_notes: notes }, resolve)
  })
}

export async function getFirebaseToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get('firebase_token', (result) => {
      resolve((result.firebase_token as string) ?? null)
    })
  })
}

export async function setFirebaseToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ firebase_token: token }, resolve)
  })
}
