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
import type { BrainBookmark } from '../types'

import { getDomainKey } from './chains'

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
  const url = node.url ?? ''
  return {
    id: node.id,
    url,
    title: node.title || domainFromUrl(url),
    note: '',
    tags: [],
    addedAt: node.dateAdded ?? Date.now(),
    health: 'unchecked',
    source: 'chrome',
    uid,
    domainKey: getDomainKey(url),
    parentId: null,
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
  await getSettings()

  const existing = await getCachedBookmarks()
  const existingById  = new Map(existing.map((b) => [b.id,  b]))
  const existingByUrl = new Map(existing.map((b) => [b.url, b]))

  const seenUrls = new Set<string>()
  const dedupedFlat = flat.filter((node) => {
    const url = node.url ?? ''
    if (!url || seenUrls.has(url)) return false
    seenUrls.add(url)
    return true
  })

  const bookmarks: BrainBookmark[] = dedupedFlat.map((node) => {
    const bm = chromeNodeToBookmark(node, uid)

    const cached = existingById.get(node.id) ?? existingByUrl.get(node.url ?? '')

    if (cached) {
      bm.note = cached.note || bm.note
      bm.tags = cached.tags.length ? cached.tags : bm.tags
      bm.health = cached.health ?? 'unchecked'
      if (cached.parentId !== undefined) bm.parentId = cached.parentId
      if (cached.domainKey) bm.domainKey = cached.domainKey
    }

    return bm
  })

  await setCachedBookmarks(bookmarks)

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
