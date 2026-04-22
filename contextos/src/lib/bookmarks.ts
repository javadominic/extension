import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import {
  getCachedBookmarks,
  setCachedBookmarks,
  upsertBookmark,
  removeBookmark,
  getSettings,
} from './storage'
import { suggestNote, autoTag } from './gemini'
import type { BrainBookmark } from '../types'

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/** Convert a Chrome bookmark node to a BrainBookmark skeleton. */
export function chromeNodeToBookmark(
  node: chrome.bookmarks.BookmarkTreeNode,
  uid: string
): BrainBookmark {
  return {
    id: node.id,
    url: node.url ?? '',
    title: node.title || domainFromUrl(node.url ?? ''),
    note: '',
    tags: [],
    addedAt: node.dateAdded ?? Date.now(),
    health: 'unchecked',
    source: 'chrome',
    uid,
  }
}

/** Recursively flatten chrome bookmark tree into a flat list. */
export function flattenTree(
  nodes: chrome.bookmarks.BookmarkTreeNode[]
): chrome.bookmarks.BookmarkTreeNode[] {
  const result: chrome.bookmarks.BookmarkTreeNode[] = []
  for (const node of nodes) {
    if (node.url) result.push(node)
    if (node.children) result.push(...flattenTree(node.children))
  }
  return result
}

/** Fetch all chrome bookmarks and sync to local cache + Firestore. */
export async function syncChromeBookmarks(uid: string): Promise<BrainBookmark[]> {
  const tree = await chrome.bookmarks.getTree()
  const flat = flattenTree(tree)
  const settings = await getSettings()
  
  // Get existing bookmarks to preserve custom notes and tags
  const existing = await getCachedBookmarks()
  const existingMap = new Map(existing.map((b) => [b.id, b]))

  const bookmarks: BrainBookmark[] = await Promise.all(
    flat.map(async (node) => {
      const existingBm = existingMap.get(node.id)
      const bm = chromeNodeToBookmark(node, uid)
      
      // Preserve existing data if present
      if (existingBm) {
        bm.note = existingBm.note
        bm.tags = existingBm.tags
        bm.health = existingBm.health
      }

      if (settings.geminiApiKey && !bm.note) {
        bm.note = await suggestNote(bm.url, bm.title, settings.geminiApiKey)
        bm.tags = await autoTag(bm.url, bm.title, bm.note, settings.geminiApiKey)
      }
      return bm
    })
  )

  await setCachedBookmarks(bookmarks)

  // Persist to Firestore if user is signed in
  if (uid) {
    const colRef = collection(db, 'bookmarks', uid, 'items')
    for (const bm of bookmarks) {
      await setDoc(doc(colRef, bm.id), bm)
    }
  }

  return bookmarks
}

/** Save / update a single bookmark in cache + Firestore. */
export async function saveBookmark(bm: BrainBookmark): Promise<void> {
  await upsertBookmark(bm)
  if (bm.uid) {
    const ref = doc(db, 'bookmarks', bm.uid, 'items', bm.id)
    await setDoc(ref, bm, { merge: true })
  }
}

/** Update the note and tags field for a bookmark. */
export async function updateNote(
  id: string,
  note: string,
  tags: string[],
  uid: string
): Promise<void> {
  const cache = await getCachedBookmarks()
  const bm = cache.find((b) => b.id === id)
  if (!bm) return
  bm.note = note
  bm.tags = tags
  await upsertBookmark(bm)
  if (uid) {
    const ref = doc(db, 'bookmarks', uid, 'items', id)
    await updateDoc(ref, { note, tags })
  }
}

/** Delete a bookmark from cache + Firestore. */
export async function deleteBookmark(id: string, uid: string): Promise<void> {
  await removeBookmark(id)
  if (uid) {
    const ref = doc(db, 'bookmarks', uid, 'items', id)
    await deleteDoc(ref)
  }
}

/** Fetch all Firestore bookmarks for a user (initial load). */
export async function fetchFirestoreBookmarks(uid: string): Promise<BrainBookmark[]> {
  const colRef = collection(db, 'bookmarks', uid, 'items')
  const snapshot = await getDocs(colRef)
  return snapshot.docs.map((d) => d.data() as BrainBookmark)
}
