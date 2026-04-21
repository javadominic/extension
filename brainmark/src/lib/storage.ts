import type { BrainBookmark, AppSettings } from '../types'

// ─────────────────────────────────────────────
// chrome.storage.SYNC  →  small stuff, all devices
// Think: settings, preferences, team ID
// Max: 8KB per key, 100KB total
// ─────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const result = await chrome.storage.sync.get('settings')
  return result.settings ?? {
    geminiApiKey: '',
    toastEnabled: true,
    theme: 'system',
  }
}

export async function saveSettings(patch: Partial<AppSettings>) {
  const current = await getSettings()
  await chrome.storage.sync.set({ settings: { ...current, ...patch } })
}

export async function getHealthStatus(): Promise<Record<string, 'alive' | 'dead' | 'unchecked'>> {
  const result = await chrome.storage.sync.get('health_status')
  return result.health_status ?? {}
}

export async function setHealthStatus(
  status: Record<string, 'alive' | 'dead' | 'unchecked'>
): Promise<void> {
  await chrome.storage.sync.set({ health_status: status })
}

// ─────────────────────────────────────────────
// chrome.storage.LOCAL  →  big stuff, this device only
// Think: bookmark list, AI embeddings, import history
// Max: 10MB total — plenty of room
// ─────────────────────────────────────────────

// Read ALL cached bookmarks
export async function getCachedBookmarks(): Promise<BrainBookmark[]> {
  const result = await chrome.storage.local.get('bookmarks_cache')
  return result.bookmarks_cache ?? []   // returns empty array if nothing saved yet
}

// Save the full bookmark list
export async function setCachedBookmarks(bookmarks: BrainBookmark[]) {
  await chrome.storage.local.set({ bookmarks_cache: bookmarks })
}

// Add one bookmark (or update if it already exists)
export async function upsertBookmark(bookmark: BrainBookmark) {
  const all = await getCachedBookmarks()
  const idx = all.findIndex(b => b.id === bookmark.id)
  if (idx >= 0) {
    all[idx] = bookmark          // update existing
  } else {
    all.unshift(bookmark)        // add new at top
  }
  await setCachedBookmarks(all)
}

// Delete one bookmark by ID
export async function removeBookmark(bookmarkId: string) {
  const all = await getCachedBookmarks()
  await setCachedBookmarks(all.filter(b => b.id !== bookmarkId))
}

// Find a bookmark by its URL (used by content script for toast)
export async function findBookmarkByUrl(url: string): Promise<BrainBookmark | null> {
  const all = await getCachedBookmarks()
  return all.find(b => b.url === url) ?? null
}

// Save Firebase auth token (so background worker can make API calls)
export async function saveFirebaseToken(token: string) {
  await chrome.storage.local.set({ firebase_token: token })
}

export async function getFirebaseToken(): Promise<string | null> {
  const result = await chrome.storage.local.get('firebase_token')
  return result.firebase_token ?? null
}

export async function setPendingEdit(id: string) {
  await chrome.storage.local.set({ pending_edit: id })
}

export async function getAndClearPendingEdit(): Promise<string | null> {
  const res = await chrome.storage.local.get('pending_edit')
  if (res.pending_edit) {
    await chrome.storage.local.remove('pending_edit')
    return res.pending_edit
  }
  return null
}
