// ============================================================
// Contextos — Third-party Importers (Pocket / Notion / Readwise)
// ============================================================
import { autoTag } from './gemini'
import { saveBookmark } from './bookmarks'
import type { BrainBookmark } from '../types'

function makeId(): string {
  return `imported_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

// ── Pocket ──────────────────────────────────────────────────

interface PocketItem {
  item_id: string
  resolved_title?: string
  given_title?: string
  resolved_url?: string
  given_url?: string
  excerpt?: string
}

export async function importFromPocket(
  consumerKey: string,
  accessToken: string,
  uid: string,
  geminiKey: string
): Promise<BrainBookmark[]> {
  const res = await fetch('https://getpocket.com/v3/get', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Accept': 'application/json' },
    body: JSON.stringify({
      consumer_key: consumerKey,
      access_token: accessToken,
      state: 'all',
      detailType: 'simple',
    }),
  })
  if (!res.ok) throw new Error(`Pocket API error: ${res.status}`)
  const data = await res.json()
  const items: PocketItem[] = Object.values(data.list ?? {}) as PocketItem[]

  const bookmarks: BrainBookmark[] = []
  for (const item of items) {
    const url = item.resolved_url ?? item.given_url ?? ''
    const title = item.resolved_title ?? item.given_title ?? url
    const note = item.excerpt ?? ''
    const tags = geminiKey ? await autoTag(url, title, note, geminiKey) : []
    const bm: BrainBookmark = {
      id: item.item_id || makeId(),
      url, title, note, tags,
      addedAt: Date.now(),
      health: 'unchecked',
      source: 'pocket',
      uid,
    }
    await saveBookmark(bm)
    bookmarks.push(bm)
  }
  return bookmarks
}

// ── Notion ──────────────────────────────────────────────────

interface NotionPage {
  id: string
  url: string
  properties?: Record<string, { title?: Array<{ plain_text: string }> }>
}

export async function importFromNotion(
  integrationToken: string,
  uid: string,
  geminiKey: string
): Promise<BrainBookmark[]> {
  const res = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${integrationToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({ filter: { property: 'object', value: 'page' } }),
  })
  if (!res.ok) throw new Error(`Notion API error: ${res.status}`)
  const data = await res.json()

  const bookmarks: BrainBookmark[] = []
  for (const page of (data.results ?? []) as NotionPage[]) {
    const url = page.url ?? ''
    const titleProp = Object.values(page.properties ?? {}).find(
      (p) => p.title
    )
    const title = titleProp?.title?.map((t) => t.plain_text).join('') ?? url
    const note = ''
    const tags = geminiKey ? await autoTag(url, title, note, geminiKey) : []
    const bm: BrainBookmark = {
      id: page.id || makeId(),
      url, title, note, tags,
      addedAt: Date.now(),
      health: 'unchecked',
      source: 'notion',
      uid,
    }
    await saveBookmark(bm)
    bookmarks.push(bm)
  }
  return bookmarks
}

// ── Readwise ────────────────────────────────────────────────

interface ReadwiseHighlight {
  id: number
  text: string
  note?: string
  book?: {
    title?: string
    source_url?: string
  }
}

export async function importFromReadwise(
  token: string,
  uid: string,
  geminiKey: string
): Promise<BrainBookmark[]> {
  const res = await fetch('https://readwise.io/api/v2/highlights/?page_size=100', {
    headers: { Authorization: `Token ${token}` },
  })
  if (!res.ok) throw new Error(`Readwise API error: ${res.status}`)
  const data = await res.json()

  const bookmarks: BrainBookmark[] = []
  for (const hl of (data.results ?? []) as ReadwiseHighlight[]) {
    const url = hl.book?.source_url ?? ''
    const title = hl.book?.title ?? url
    const note = hl.text ?? ''
    const tags = geminiKey ? await autoTag(url, title, note, geminiKey) : []
    const bm: BrainBookmark = {
      id: `rw_${hl.id}`,
      url, title, note, tags,
      addedAt: Date.now(),
      health: 'unchecked',
      source: 'readwise',
      uid,
    }
    await saveBookmark(bm)
    bookmarks.push(bm)
  }
  return bookmarks
}
