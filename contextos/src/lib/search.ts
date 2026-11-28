import type { BrainBookmark, MatchResult } from '../types'

// ── BM25F Tuning ──────────────────────────────────────────────────────────────
// k1: controls term-frequency saturation (higher = more TF influence)
// b:  controls field length normalisation (0 = none, 1 = full)
const K1 = 1.2
const B  = 0.75

const FIELD_WEIGHTS = {
  title: 3.0,
  tags:  2.2,
  note:  1.2,
  url:   0.5,
} as const

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
  'am','up','us','he','she','vs','oh','ok','go',
])

// Generic query modifiers stripped when substantive topic keywords exist.
const FILLER_WORDS = new Set([
  'best','top','good','great','better','awesome','nice','cool','free','list',
  'tool','tools','guide','tips','ideas','examples','thing','things','stuff',
  'way','ways','online','resource','resources','app','apps','platform','platforms',
])

// ── Tokenizer ─────────────────────────────────────────────────────────────────
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    // Allow 2-letter technical terms like "ui", "ux", "ai", "ml", "js", "ts"
    .filter(w => w.length >= 2 && !STOPWORDS.has(w))
}

/**
 * Tokenize a user search query, stripping generic filler adjectives
 * whenever at least one substantive topic keyword is present.
 */
function tokenizeQuery(query: string): string[] {
  const tokens = tokenize(query)
  const substantive = tokens.filter(t => !FILLER_WORDS.has(t))
  return substantive.length > 0 ? substantive : tokens
}

/** Generate consecutive bigrams: ['model','training'] → ['model_training'] */
function bigrams(tokens: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < tokens.length - 1; i++) {
    out.push(`${tokens[i]}_${tokens[i + 1]}`)
  }
  return out
}

interface BookmarkFields {
  title: string[]
  tags:  string[]
  note:  string[]
  url:   string[]
}

function extractFields(bm: BrainBookmark): BookmarkFields {
  let urlTokens: string[] = []
  try {
    const path = new URL(bm.url).pathname
    urlTokens = tokenize(path.replace(/\//g, ' '))
  } catch {}

  return {
    title: tokenize(bm.title),
    tags:  bm.tags.flatMap(t => tokenize(t)),
    note:  tokenize(bm.note ?? ''),
    url:   urlTokens,
  }
}

// ── Corpus Stats (for BM25F + Dynamic IDF) ────────────────────────────────────
interface CorpusStats {
  N:      number
  df:     Map<string, number>
  maxIdf: number
  avgLen: { title: number; tags: number; note: number; url: number }
}

function buildCorpusStats(bookmarks: BrainBookmark[]): {
  corpus: CorpusStats
  fieldsList: BookmarkFields[]
} {
  const df = new Map<string, number>()
  const totals = { title: 0, tags: 0, note: 0, url: 0 }
  const fieldsList: BookmarkFields[] = []

  for (const bm of bookmarks) {
    const fields = extractFields(bm)
    fieldsList.push(fields)

    totals.title += fields.title.length
    totals.tags  += fields.tags.length
    totals.note  += fields.note.length
    totals.url   += fields.url.length

    const allTerms = [
      ...fields.title, ...bigrams(fields.title),
      ...fields.tags,  ...bigrams(fields.tags),
      ...fields.note,  ...bigrams(fields.note),
      ...fields.url,
    ]
    const seen = new Set<string>()
    for (const t of allTerms) {
      if (!seen.has(t)) {
        df.set(t, (df.get(t) ?? 0) + 1)
        seen.add(t)
      }
    }
  }

  const N = bookmarks.length
  const denom = Math.max(N, 1)
  return {
    corpus: {
      N,
      df,
      maxIdf: Math.log((N + 0.5) / 0.5 + 1),
      avgLen: {
        title: Math.max(totals.title / denom, 1),
        tags:  Math.max(totals.tags  / denom, 1),
        note:  Math.max(totals.note  / denom, 1),
        url:   Math.max(totals.url   / denom, 1),
      },
    },
    fieldsList,
  }
}

function getIdf(term: string, corpus: CorpusStats): number {
  const termDf = corpus.df.get(term) ?? 0
  if (termDf === 0) return corpus.maxIdf
  return Math.log((corpus.N - termDf + 0.5) / (termDf + 0.5) + 1)
}

function fieldTfScore(
  queryTerms: string[],
  fieldTokens: string[],
  avgFieldLen: number,
  corpus: CorpusStats,
): number {
  if (fieldTokens.length === 0) return 0
  const tf = new Map<string, number>()
  for (const t of fieldTokens) tf.set(t, (tf.get(t) ?? 0) + 1)
  for (const bg of bigrams(fieldTokens)) tf.set(bg, (tf.get(bg) ?? 0) + 1)

  let score = 0
  const docLen = fieldTokens.length
  for (const term of queryTerms) {
    const termTf = tf.get(term) ?? 0
    if (termTf === 0) continue
    const idf = getIdf(term, corpus)
    const tfNorm = (termTf * (K1 + 1)) / (termTf + K1 * (1 - B + B * (docLen / avgFieldLen)))
    score += idf * tfNorm
  }
  return score
}

/** BM25F: score each field independently with field weights instead of duplicating tokens. */
function bm25fScore(
  queryTerms: string[],
  fields: BookmarkFields,
  corpus: CorpusStats,
): number {
  return (
    FIELD_WEIGHTS.title * fieldTfScore(queryTerms, fields.title, corpus.avgLen.title, corpus) +
    FIELD_WEIGHTS.tags  * fieldTfScore(queryTerms, fields.tags,  corpus.avgLen.tags,  corpus) +
    FIELD_WEIGHTS.note  * fieldTfScore(queryTerms, fields.note,  corpus.avgLen.note,  corpus) +
    FIELD_WEIGHTS.url   * fieldTfScore(queryTerms, fields.url,   corpus.avgLen.url,   corpus)
  )
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

/** Pick whichever stored embedding vector matches the query embedding dimensions. */
function pickCompatibleEmbedding(bm: BrainBookmark, queryDim: number): number[] | null {
  if (bm.localEmbedding && bm.localEmbedding.length === queryDim) return bm.localEmbedding
  if (bm.embedding && bm.embedding.length === queryDim) return bm.embedding
  return null
}

// ── Reason String ─────────────────────────────────────────────────────────────
function buildReason(matchedTerms: string[], tags: string[]): string {
  const words = matchedTerms.filter(t => !t.includes('_'))
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
 * Find and rank bookmarks using a 3-layer hybrid engine:
 *  1. BM25F (field-weighted) + dynamic IDF-weighted coverage gate:
 *     Automatically down-weights common corpus words across thousands of
 *     potential filler words without relying solely on a static list.
 *  2. Cosine similarity (when queryEmbedding is supplied — works with either
 *     384-dim local Transformers.js vectors or 768-dim Gemini vectors).
 *  3. Blended score: 65% cosine + 35% BM25F when both signals exist.
 */
export function findRelatedBookmarks(
  query:           string,
  bookmarks:       BrainBookmark[],
  threshold:       number,
  queryEmbedding?: number[],
): MatchResult[] {
  if (!query || query.trim().length < 2 || bookmarks.length === 0) return []

  const queryTokens = tokenizeQuery(query)
  if (queryTokens.length === 0) return []

  const queryBigrams  = bigrams(queryTokens)
  const allQueryTerms = [...queryTokens, ...queryBigrams]

  const { corpus, fieldsList } = buildCorpusStats(bookmarks)
  const totalQueryIdf = queryTokens.reduce((sum, t) => sum + getIdf(t, corpus), 0)

  // Cosine threshold calibrated to sensitivity slider (1.0 broad → 5.0 strict)
  const cosineThreshold = 0.28 + threshold * 0.074
  const normalizedThreshold = threshold * 0.084

  const results: MatchResult[] = []

  for (let i = 0; i < bookmarks.length; i++) {
    const bm = bookmarks[i]
    const fields = fieldsList[i]

    const titleTagSet = new Set([...fields.title, ...fields.tags])
    const allDocTerms = [
      ...fields.title, ...bigrams(fields.title),
      ...fields.tags,  ...bigrams(fields.tags),
      ...fields.note,  ...bigrams(fields.note),
      ...fields.url,
    ]
    const docTermSet = new Set(allDocTerms)

    // ── Dynamic IDF-Weighted Coverage Gate ────────────────────────────────
    const matchedKeywords = queryTokens.filter(t => docTermSet.has(t))
    const matchedIdf = matchedKeywords.reduce((sum, t) => sum + getIdf(t, corpus), 0)
    const idfCoverage = totalQueryIdf > 0 ? matchedIdf / totalQueryIdf : 0

    // Guardrail for 3+ word queries: don't let a single low-IDF word in a note pass
    const singleWeakMatch =
      queryTokens.length >= 3 &&
      matchedKeywords.length === 1 &&
      (getIdf(matchedKeywords[0], corpus) < corpus.maxIdf * 0.65 ||
        !titleTagSet.has(matchedKeywords[0]))

    // For 2-word queries, allow a 1-word match if that word is reasonably specific
    // (appears in < 40% of bookmarks) and appears in title or tags — otherwise an
    // unseen second word (df=0 -> maxIdf) would mathematically block every 1-word match.
    const twoWordSingleMatch =
      queryTokens.length === 2 &&
      matchedKeywords.length === 1 &&
      getIdf(matchedKeywords[0], corpus) >= corpus.maxIdf * 0.35 &&
      titleTagSet.has(matchedKeywords[0])

    const passesKeywordGate =
      matchedKeywords.length > 0 &&
      !singleWeakMatch &&
      (idfCoverage >= 0.45 || matchedKeywords.length >= 2 || twoWordSingleMatch)

    // ── Cosine Similarity (Local 384-dim or Gemini 768-dim) ───────────────
    const docEmb = queryEmbedding && queryEmbedding.length > 0
      ? pickCompatibleEmbedding(bm, queryEmbedding.length)
      : null
    const canUseCosine = docEmb !== null

    let cosScore = 0
    if (canUseCosine) {
      cosScore = cosineSimilarity(queryEmbedding!, docEmb!)
    }

    const passesCosine = canUseCosine && cosScore >= cosineThreshold
    if (!passesKeywordGate && !passesCosine) continue

    // ── BM25F Score + Phrase Bonus ────────────────────────────────────────
    const rawBm25f = bm25fScore(allQueryTerms, fields, corpus)
    const hasPhrase =
      queryBigrams.length > 0 &&
      queryBigrams.some(bg => docTermSet.has(bg))
    const bm25Final = rawBm25f * (hasPhrase ? 1.5 : 1.0)

    // Normalise BM25F (~0-25 range) and scale by IDF coverage so full matches lead
    const bm25Norm = Math.min(bm25Final / 20, 1) * (0.4 + 0.6 * idfCoverage)

    const finalScore = canUseCosine
      ? 0.35 * bm25Norm + 0.65 * cosScore
      : bm25Norm

    if (finalScore < normalizedThreshold && !passesCosine) continue

    results.push({
      bookmark:    bm,
      score:       finalScore,
      matchReason: buildReason(matchedKeywords, bm.tags),
    })
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, 5)
}

/** Lightweight single-bookmark scorer. */
export function scoreBookmark(
  query:    string,
  bookmark: BrainBookmark,
): { score: number; reason: string } {
  const { corpus, fieldsList } = buildCorpusStats([bookmark])
  const fields = fieldsList[0]
  const qTokens = tokenizeQuery(query)
  if (qTokens.length === 0) return { score: 0, reason: '' }

  const qBigrams = bigrams(qTokens)
  const allQTerms = [...qTokens, ...qBigrams]
  const allDocTerms = [
    ...fields.title, ...bigrams(fields.title),
    ...fields.tags,  ...bigrams(fields.tags),
    ...fields.note,  ...bigrams(fields.note),
    ...fields.url,
  ]
  const docTermSet = new Set(allDocTerms)

  const matched = qTokens.filter(t => docTermSet.has(t))
  const minRequired = Math.max(1, Math.ceil(qTokens.length * 0.5))
  if (matched.length < minRequired) return { score: 0, reason: '' }

  const hasPhrase = qBigrams.some(bg => docTermSet.has(bg))
  const raw = bm25fScore(allQTerms, fields, corpus)
  const score = raw * (hasPhrase ? 1.5 : 1.0)

  return { score, reason: buildReason(matched, bookmark.tags) }
}
