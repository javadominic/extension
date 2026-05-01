import type { BrainBookmark } from '../types'

const BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

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
  
  if (data?.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked prompt (${data.promptFeedback.blockReason}).`)
  }

  const candidate = data?.candidates?.[0]
  // Safety filter or recitation block — candidate exists but content is null
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

/** Suggest why someone saved a bookmark (max 15 words). Throws on real API errors. */
export async function suggestNote(
  url: string,
  title: string,
  apiKey: string,
  pageText?: string
): Promise<string> {
  // Strengthen the prompt so Gemini ALWAYS produces output — even without page text
  let prompt = `You are a helpful bookmark assistant. Write ONE short sentence (max 15 words) explaining why someone would save this page. You MUST always produce a sentence — never return empty. Base it on the title and URL if page content is unavailable.\nTitle: "${title}"\nURL: ${url}`
  if (pageText && pageText.trim().length > 30) {
    prompt += `\nPage snippet:\n${pageText.substring(0, 3000)}`
  }
  prompt += `\n\nRespond with ONLY the sentence. No intro, no quotes, no preamble.`

  try {
    return await callGemini(prompt, apiKey)
  } catch (err) {
    if ((err as Error).message === 'RATE_LIMIT') return ''
    // Re-throw real errors (bad key, network, etc.) so caller can surface them
    throw err
  }
}

/** Auto-generate 2–4 lowercase tags for a bookmark. */
export async function autoTag(
  url: string,
  title: string,
  note: string,
  apiKey: string,
  pageText?: string
): Promise<string[]> {
  try {
    let prompt = `Generate 2-4 short lowercase tags for this bookmark.\nTitle: ${title}, URL: ${url}, Note: ${note}.`
    if (pageText) {
      prompt += `\nPage Content Snippet:\n${pageText}\n`
    }
    prompt += `\nReply with only a JSON array of strings like ["tag1","tag2"]. No explanation.`
    
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
