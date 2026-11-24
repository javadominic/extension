import type { BrainBookmark } from '../types'

async function getModelName(): Promise<string> {
  try {
    const res = await chrome.storage.sync.get('settings')
    if (res?.settings?.geminiModel) return res.settings.geminiModel
  } catch {}
  return 'gemini-2.5-flash'
}

async function callGemini(prompt: string, apiKey: string, isJson = false): Promise<string> {
  let model = await getModelName()
  let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const generationConfig: any = {
    temperature: 0.4,
    maxOutputTokens: 512,
    // Disable the hidden "thinking" token budget on gemini-2.5-flash.
    // Without this, thinking tokens silently consume the entire maxOutputTokens
    // allowance, leaving no room for the actual response and producing truncated
    // output like `{"` instead of a complete JSON object.
    thinkingConfig: { thinkingBudget: 0 },
  }
  if (isJson) {
    generationConfig.responseMimeType = 'application/json'
  }
  let response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig,
    }),
  })

  // If 404 on gemini-2.5-flash, fallback to gemini-3.5-flash for newer keys/accounts
  if (response.status === 404 && model === 'gemini-2.5-flash') {
    model = 'gemini-3.5-flash'
    url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
      }),
    })
    if (response.ok) {
      try {
        const s = (await chrome.storage.sync.get('settings'))?.settings || {}
        await chrome.storage.sync.set({ settings: { ...s, geminiModel: model } })
      } catch {}
    }
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') ?? '60'
    throw new Error(`RATE_LIMIT:${retryAfter}`)
  }
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  
  if (data?.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked prompt (${data.promptFeedback.blockReason}).`)
  }

  const candidate = data?.candidates?.[0]
  // Safety filter or recitation block - candidate exists but content is null
  if (candidate && !candidate.content) {
    const reason = candidate.finishReason ?? 'SAFETY'
    throw new Error(`Gemini blocked response (${reason}).`)
  }
  
  const text = candidate?.content?.parts?.[0]?.text?.trim() ?? ''
  if (!text) {
    throw new Error('Gemini API returned empty response structure.')
  }
  return text
}

/** Combined call: returns both note and tags in ONE request to save RPD quota. */
export async function suggestNoteAndTags(
  url: string,
  title: string,
  apiKey: string,
  pageText?: string
): Promise<{ note: string; tags: string[] }> {
  let prompt = `You are a helpful bookmark assistant. Given the page below, return a JSON object with two fields:
1. "note": ONE short sentence (max 15 words) explaining why someone would save this page. ALWAYS produce a sentence.
2. "tags": an array of 2-4 short lowercase tags (e.g. ["react","tutorial","frontend"]).

Title: "${title}"
URL: ${url}`

  if (pageText && pageText.trim().length > 30) {
    prompt += `\nPage snippet:\n${pageText.substring(0, 3000)}`
  }
  prompt += `\n\nRespond with ONLY valid JSON like {"note":"...","tags":["...","..."]}. No markdown, no explanation.`

  const raw = await callGemini(prompt, apiKey, true)

  // Try to parse JSON - be forgiving in case Gemini wraps it in ```json
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as { note?: string; tags?: string[] }
      const note = (parsed.note ?? '').trim()
      const tags = Array.isArray(parsed.tags) ? parsed.tags.map(String) : []
      if (note) return { note, tags }
    } catch { /* fall through to fallback */ }
  }

  // Fallback: if JSON.parse fails, try to extract note from broken JSON
  let noteFallback = raw.trim()
  const partialMatch = noteFallback.match(/"note"\s*:\s*"([^"]+)/)
  if (partialMatch) {
    noteFallback = partialMatch[1]
  } else {
    noteFallback = noteFallback.replace(/^[^{]*{\s*"note"\s*:\s*"/, '').replace(/"\s*}.*$/, '')
  }
  return { note: noteFallback.trim() || title, tags: [] }
}

/** Suggest why someone saved a bookmark (max 15 words). Throws on real API errors. */
export async function suggestNote(
  url: string,
  title: string,
  apiKey: string,
  pageText?: string
): Promise<string> {
  // Kept for backward compat - just delegates to the combined call
  const { note } = await suggestNoteAndTags(url, title, apiKey, pageText)
  return note
}


/** Auto-generate 2-4 lowercase tags for a bookmark. */
export async function autoTag(
  url: string,
  title: string,
  note: string,
  apiKey: string,
  pageText?: string
): Promise<string[]> {
  try {
    // If we already have a note, use it in the prompt for better tags
    const { tags } = await suggestNoteAndTags(url, title, apiKey, pageText)
    return tags
  } catch (err) {
    if ((err as Error).message?.includes('RATE_LIMIT')) return []
    console.error('[Gemini] autoTag error:', err)
    return []
  }
}


/** Semantic search: return bookmark IDs ordered by relevance. */
export async function semanticSearch(
  query: string,
  bookmarks: BrainBookmark[],
  apiKey: string
): Promise<string[]> {
  if (!bookmarks.length || !query.trim()) return []
  try {
    const slimBookmarks = bookmarks.map((b) => ({
      id: b.id,
      title: b.title,
      note: b.note,
      tags: b.tags,
    }))
    const prompt = `Given this search query: '${query}', return the IDs of the most relevant bookmarks from this list (JSON): ${JSON.stringify(slimBookmarks)}\nReply with only a JSON array of matching IDs, ordered by relevance. Max 10 results.`
    const raw = await callGemini(prompt, apiKey, true)
    const match = raw.match(/\[.*?\]/s)
    if (match) return JSON.parse(match[0]) as string[]
    return []
  } catch (err) {
    if ((err as Error).message === 'RATE_LIMIT') {
      // Fallback: simple title/note keyword match
      const q = query.toLowerCase()
      return bookmarks
        .filter(
          (b) =>
            b.title.toLowerCase().includes(q) ||
            b.note.toLowerCase().includes(q) ||
            b.tags.some((t) => t.includes(q))
        )
        .slice(0, 10)
        .map((b) => b.id)
    }
    console.error('[Gemini] semanticSearch error:', err)
    return []
  }
}

/**
 * Generate a single embedding vector for a search query.
 * Uses text-embedding-004 — 1 API call per search, not per bookmark.
 * Returns null silently on any error so caller can fall back to BM25-only.
 */
export async function getQueryEmbedding(
  query: string,
  apiKey: string,
): Promise<number[] | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text: query }] },
        taskType: 'RETRIEVAL_QUERY',
      }),
    })
    if (!response.ok) return null
    const data = await response.json()
    return data?.embedding?.values ?? null
  } catch {
    return null
  }
}
