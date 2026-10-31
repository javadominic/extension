import type { BrainBookmark, MatchResult } from '../types'

const STOPWORDS = new Set([
  // Articles, conjunctions, prepositions
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'is','are','was','were','be','been','being','have','has','had','do',
  'does','did','will','would','could','should','may','might','this','that',
  'it','its','from','by','as','not','no','so','if','when','about','what',
  // Common question / filler words that appear in search queries but not in notes
  'where','how','why','who','which','can','see','show','find','get','tell',
  'want','need','use','using','used','look','looking','give','make','let',
  'also','just','still','even','like','more','some','any','all','my','me',
  'you','your','we','our','they','their','there','here','now','then','too',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
}

function buildReason(matchedKeywords: string[], tags: string[]): string {
  const matchedTags = tags.filter(t => matchedKeywords.some(kw => t.includes(kw)))
  if (matchedTags.length > 0) return `Matches tag${matchedTags.length > 1 ? 's' : ''}: ${matchedTags.slice(0, 2).map(t => `#${t}`).join(', ')}`
  if (matchedKeywords.length > 0) return `Mentions: ${matchedKeywords.slice(0, 3).join(', ')}`
  return 'Related to your search'
}

/** Returns true if the field contains the keyword OR the keyword is a prefix of a word in the field */
function fuzzyMatch(field: string, kw: string): boolean {
  if (field.includes(kw)) return true
  // prefix match: "stat" matches "stats", "track" matches "tracker"
  return field.split(/\s+/).some(word => word.startsWith(kw) || kw.startsWith(word))
}

export function scoreBookmark(query: string, bookmark: BrainBookmark): { score: number; reason: string } {
  const keywords = tokenize(query)
  if (keywords.length === 0) return { score: 0, reason: '' }

  const title = bookmark.title.toLowerCase()
  const note  = (bookmark.note ?? '').toLowerCase()
  const url   = (bookmark.url ?? '').toLowerCase()
  const tags  = bookmark.tags.map(t => t.toLowerCase())

  let score = 0
  const matched: string[] = []

  for (const kw of keywords) {
    let kwScore = 0

    if (fuzzyMatch(title, kw)) {
      kwScore += title === kw ? 5 : 3
    }
    if (tags.some(t => t === kw || fuzzyMatch(t, kw))) {
      kwScore += 2.5
    }
    if (fuzzyMatch(note, kw)) {
      kwScore += 1.5
    }
    // URL matching catches cases like "valorant" in the domain/path
    if (fuzzyMatch(url, kw)) {
      kwScore += kwScore === 0 ? 1 : 0.5
    }

    if (kwScore > 0) {
      score += kwScore
      matched.push(kw)
    }
  }

  // Normalise by matched count so generic query words ("can", "see", "where")
  // don't dilute the score of a strong partial match.
  const normalised = matched.length > 0 ? score / matched.length : 0

  return { score: normalised, reason: buildReason(matched, bookmark.tags) }
}

export function findRelatedBookmarks(
  query: string,
  bookmarks: BrainBookmark[],
  threshold: number
): MatchResult[] {
  if (!query || query.trim().length < 3 || bookmarks.length === 0) return []

  const results: MatchResult[] = []

  for (const bm of bookmarks) {
    const { score, reason } = scoreBookmark(query, bm)
    if (score >= threshold) {
      results.push({ bookmark: bm, score, matchReason: reason })
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, 3)
}
