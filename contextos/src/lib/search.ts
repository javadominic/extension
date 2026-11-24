import type { BrainBookmark, MatchResult } from '../types'

// ── BM25 Tuning ───────────────────────────────────────────────────────────────
// k1: controls term-frequency saturation (higher = more TF influence)
// b:  controls length normalisation (0 = none, 1 = full)
const K1 = 1.2
const B  = 0.75

// ── Stopwords ─────────────────────────────────────────────────────────────────
const STOPWORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'is','are','was','were','be','been','being','have','has','had','do',
  'does','did','will','would','could','should','may','might','this','that',
  'it','its','from','by','as','not','no','so','if','when','about','what',
  'where','how','why','who','which','can','see','show','find','get','tell',
  'want','need','use','using','used','look','looking','give','make','let',
  'also','just','still','even','like','more','some','any','all','my','me',
  'you','your','we','our','they','their','there','here','now','then','too',
  'page','site','link','web','website','http','https','www','com','html',
  'click','read','article','post','blog','new','one','two','three',
])

// ── Tokenizer ─────────────────────────────────────────────────────────────────
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
}

/** Generate consecutive bigrams: ['model','training'] → ['model_training'] */
function bigrams(tokens: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < tokens.length - 1; i++) {
    out.push(`${tokens[i]}_${tokens[i + 1]}`)
  }
  return out
}

/**
 * Flatten a bookmark into a weighted token bag.
 * Title repeated × 3 (most important signal).
 * Tags repeated × 2 (explicit intent labels).
 * Note × 1 (supporting context).
 * URL path segments × 0.5 (least reliable).
 */
function bookmarkTokens(bm: BrainBookmark): string[] {
  const titleTokens = tokenize(bm.title)
  const noteTokens  = tokenize(bm.note ?? '')
  const tagTokens   = bm.tags.flatMap(t => tokenize(t))

  let urlTokens: string[] = []
  try {
    const path = new URL(bm.url).pathname
    urlTokens = tokenize(path.replace(/\//g, ' '))
  } catch {}

  return [
    ...titleTokens, ...titleTokens, ...titleTokens,
    ...tagTokens,   ...tagTokens,
    ...noteTokens,
    ...urlTokens,
  ]
}

// ── Corpus Stats ──────────────────────────────────────────────────────────────
interface CorpusStats {
  N:     number                   // total bookmark count
  df:    Map<string, number>      // document frequency per term
  avgdl: number                   // average document token length
}

function buildCorpusStats(bookmarks: BrainBookmark[]): CorpusStats {
  const df     = new Map<string, number>()
  let totalLen = 0

  for (const bm of bookmarks) {
    const tokens = bookmarkTokens(bm)
    totalLen += tokens.length

    const bgs     = bigrams(tokens)
    const allTerms = [...tokens, ...bgs]
    const seen    = new Set<string>()

    for (const t of allTerms) {
      if (!seen.has(t)) {
        df.set(t, (df.get(t) ?? 0) + 1)
        seen.add(t)
      }
    }
  }

  return {
    N:     bookmarks.length,
    df,
    avgdl: bookmarks.length > 0 ? totalLen / bookmarks.length : 10,
  }
}

// ── BM25 Scorer ───────────────────────────────────────────────────────────────
function bm25Score(
  queryTerms: string[],
  docTokens:  string[],
  corpus:     CorpusStats,
): number {
  const { N, df, avgdl } = corpus
  const docLen = docTokens.length

  const tf = new Map<string, number>()
  for (const t of docTokens) tf.set(t, (tf.get(t) ?? 0) + 1)

  let score = 0
  for (const term of queryTerms) {
    const termTf = tf.get(term) ?? 0
    if (termTf === 0) continue

    const termDf = df.get(term) ?? 0
    const idf    = Math.log((N - termDf + 0.5) / (termDf + 0.5) + 1)
    const tfNorm = (termTf * (K1 + 1)) /
                   (termTf + K1 * (1 - B + B * (docLen / avgdl)))
    score += idf * tfNorm
  }

  return score
}

// ── Cosine Similarity ─────────────────────────────────────────────────────────
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

// ── Reason String ─────────────────────────────────────────────────────────────
function buildReason(matchedTerms: string[], tags: string[]): string {
  const words     = matchedTerms.filter(t => !t.includes('_'))
  const matchedTags = tags.filter(t =>
    words.some(kw => t.toLowerCase().includes(kw))
  )
  if (matchedTags.length > 0) {
    return `Matches tag${matchedTags.length > 1 ? 's' : ''}: ${
      matchedTags.slice(0, 2).map(t => `#${t}`).join(', ')
    }`
  }
  if (words.length > 0) {
    return `Mentions: ${words.slice(0, 3).join(', ')}`
  }
  return 'Semantically related'
}

// ── Main Entry Point ──────────────────────────────────────────────────────────
/**
 * Find and rank bookmarks for a query using a 3-layer hybrid engine:
 *
 *  1. BM25 (always): proper TF-IDF with bigram phrase detection.
 *     Prevents "train" from matching "training" and enforces that
 *     at least 50% of query keywords appear in the document.
 *
 *  2. Cosine similarity (when queryEmbedding is supplied):
 *     Uses pre-stored bookmark.embedding vectors so no extra API
 *     calls are made per bookmark — just one embedding for the query.
 *
 *  3. Blended score: when both signals are present, cosine gets 65%
 *     weight (semantic intent) and BM25 gets 35% (lexical precision).
 *
 * @param query          Raw search string from user
 * @param bookmarks      Full bookmark list to search
 * @param threshold      Sensitivity (1.0 broad → 5.0 strict, same scale as before)
 * @param queryEmbedding Optional pre-computed embedding vector for the query
 */
export function findRelatedBookmarks(
  query:          string,
  bookmarks:      BrainBookmark[],
  threshold:      number,
  queryEmbedding?: number[],
): MatchResult[] {
  if (!query || query.trim().length < 2 || bookmarks.length === 0) return []

  const queryTokens  = tokenize(query)
  if (queryTokens.length === 0) return []

  const queryBigrams  = bigrams(queryTokens)
  const allQueryTerms = [...queryTokens, ...queryBigrams]

  const corpus = buildCorpusStats(bookmarks)

  // Determine cosine threshold from sensitivity slider
  // threshold 1.0 (broad) → cosine >= 0.35
  // threshold 2.5 (default) → cosine >= 0.48
  // threshold 5.0 (strict) → cosine >= 0.65
  const cosineThreshold = 0.28 + threshold * 0.074

  const results: MatchResult[] = []

  for (const bm of bookmarks) {
    const docTokens  = bookmarkTokens(bm)
    const docBigrams = bigrams(docTokens)
    const allDocTerms = [...docTokens, ...docBigrams]
    const docTermSet  = new Set(allDocTerms)

    // ── 50% Keyword Coverage Gate ──────────────────────────────────────────
    // A bookmark must contain at least half of the query's keywords.
    // This is the primary fix for "model training" hitting train booking sites:
    // if only "train" (from "training") loosely matches but "model" doesn't, 
    // the bookmark is eliminated before scoring.
    const matchedKeywords = queryTokens.filter(t => docTermSet.has(t))
    const minRequired     = Math.max(1, Math.ceil(queryTokens.length * 0.5))

    // ── Cosine Similarity ──────────────────────────────────────────────────
    const hasQueryEmb  = queryEmbedding && queryEmbedding.length > 0
    const hasDocEmb    = bm.embedding   && bm.embedding.length > 0
    const canUseCosine = hasQueryEmb && hasDocEmb

    let cosScore = 0
    if (canUseCosine) {
      cosScore = cosineSimilarity(queryEmbedding!, bm.embedding!)
    }

    // Skip bookmark if it passes neither the keyword gate nor cosine threshold.
    // This is an OR: semantic similarity can rescue a bookmark even if its
    // text uses different words, but keyword gate must pass for BM25-only path.
    const passesKeywordGate = matchedKeywords.length >= minRequired
    const passesCosine      = canUseCosine && cosScore >= cosineThreshold

    if (!passesKeywordGate && !passesCosine) continue

    // ── BM25 Score ─────────────────────────────────────────────────────────
    const rawBm25 = bm25Score(allQueryTerms, allDocTerms, corpus)

    // Phrase bonus: if the exact bigram of two adjacent query words appears
    // in the document, that's a strong signal — apply a 1.6× multiplier.
    const hasPhrase    = queryBigrams.length > 0 &&
                         queryBigrams.some(bg => docTermSet.has(bg))
    const bm25Final    = rawBm25 * (hasPhrase ? 1.6 : 1.0)

    // ── Blended Final Score ────────────────────────────────────────────────
    // BM25 raw scores are roughly 0-15; normalise to 0-1 dividing by 12.
    // Cosine is already 0-1.
    // With both: weight cosine 65% (semantic intent) + BM25 35% (lexical match).
    const bm25Norm  = Math.min(bm25Final / 12, 1)
    const finalScore = canUseCosine
      ? 0.35 * bm25Norm + 0.65 * cosScore
      : bm25Norm

    // Map the threshold slider (1-5) to the 0-1 finalScore scale.
    // threshold 1.0 → 0.08 (broad), threshold 2.5 → 0.20, threshold 5.0 → 0.42
    const normalizedThreshold = threshold * 0.084

    if (finalScore < normalizedThreshold && !passesCosine) continue
    if (!passesKeywordGate && !passesCosine) continue

    results.push({
      bookmark:    bm,
      score:       finalScore,
      matchReason: buildReason(matchedKeywords, bm.tags),
    })
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, 5)
}

/** Lightweight single-bookmark scorer used by SearchPage no-key fallback. */
export function scoreBookmark(
  query:    string,
  bookmark: BrainBookmark,
): { score: number; reason: string } {
  const corpus      = buildCorpusStats([bookmark])
  const qTokens     = tokenize(query)
  if (qTokens.length === 0) return { score: 0, reason: '' }

  const qBigrams    = bigrams(qTokens)
  const allQTerms   = [...qTokens, ...qBigrams]
  const docTokens   = bookmarkTokens(bookmark)
  const docBigrams  = bigrams(docTokens)
  const allDocTerms = [...docTokens, ...docBigrams]
  const docTermSet  = new Set(allDocTerms)

  const matched     = qTokens.filter(t => docTermSet.has(t))
  const minRequired = Math.max(1, Math.ceil(qTokens.length * 0.5))
  if (matched.length < minRequired) return { score: 0, reason: '' }

  const hasPhrase = qBigrams.some(bg => docTermSet.has(bg))
  const raw       = bm25Score(allQTerms, allDocTerms, corpus)
  const score     = raw * (hasPhrase ? 1.6 : 1.0)

  return { score, reason: buildReason(matched, bookmark.tags) }
}
