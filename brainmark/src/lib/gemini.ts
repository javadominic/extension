import type { BrainBookmark } from '../types'

const BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(`${BASE_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 256 },
    }),
  })

  if (response.status === 429) {
    throw new Error('RATE_LIMIT')
  }
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
}

/** Suggest why someone saved a bookmark (max 15 words). */
export async function suggestNote(
  url: string,
  title: string,
  apiKey: string
): Promise<string> {
  try {
    const prompt = `In one short sentence (max 15 words), explain why someone would save this bookmark:\nTitle: ${title}, URL: ${url}. Reply with only the note, no preamble.`
    return await callGemini(prompt, apiKey)
  } catch (err) {
    if ((err as Error).message === 'RATE_LIMIT') return 'Saved for later reading.'
    console.error('[Gemini] suggestNote error:', err)
    try {
      const domain = new URL(url).hostname.replace(/^www\./, '')
      return `Interesting find from ${domain} worth revisiting.`
    } catch {
      return 'Interesting resource worth revisiting.'
    }
  }
}

/** Auto-generate 2–4 lowercase tags for a bookmark. */
export async function autoTag(
  url: string,
  title: string,
  note: string,
  apiKey: string
): Promise<string[]> {
  try {
    const prompt = `Generate 2-4 short lowercase tags for this bookmark.\nTitle: ${title}, URL: ${url}, Note: ${note}.\nReply with only a JSON array of strings like ["tag1","tag2"]. No explanation.`
    const raw = await callGemini(prompt, apiKey)
    // Extract JSON array from response
    const match = raw.match(/\[.*?\]/s)
    if (match) return JSON.parse(match[0]) as string[]
    return []
  } catch (err) {
    if ((err as Error).message === 'RATE_LIMIT') return []
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
    const raw = await callGemini(prompt, apiKey)
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
