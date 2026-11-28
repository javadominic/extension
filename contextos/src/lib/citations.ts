import type { BrainBookmark } from '../types'

export type CitationStyle = 'apa' | 'mla' | 'chicago' | 'ieee' | 'bibtex'

export const CITATION_STYLES: { id: CitationStyle; label: string }[] = [
  { id: 'apa',     label: 'APA 7' },
  { id: 'mla',     label: 'MLA 9' },
  { id: 'chicago', label: 'Chicago' },
  { id: 'ieee',    label: 'IEEE' },
  { id: 'bibtex',  label: 'BibTeX' },
]

/**
 * Builds a Chrome/Opera Text Fragment URL (`#:~:text=...`) so clicking a cited
 * bookmark opens the page and scrolls straight to the highlighted passage.
 */
export function buildTextFragmentUrl(url: string, quote?: string): string {
  const clean = quote?.replace(/\s+/g, ' ').trim()
  if (!clean || clean.length < 6) return url

  const base = url.split('#')[0]
  const words = clean.split(' ')
  if (words.length <= 10) {
    return `${base}#:~:text=${encodeURIComponent(clean)}`
  }
  const start = words.slice(0, 4).join(' ')
  const end = words.slice(-4).join(' ')
  return `${base}#:~:text=${encodeURIComponent(start)},${encodeURIComponent(end)}`
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function splitAuthorName(name: string): { first: string; last: string } {
  const trimmed = name.trim()
  if (trimmed.includes(',')) {
    const [last, ...rest] = trimmed.split(',')
    return { last: last.trim(), first: rest.join(',').trim() }
  }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { first: '', last: parts[0] }
  return {
    first: parts.slice(0, -1).join(' '),
    last: parts[parts.length - 1],
  }
}

function toInitials(first: string): string {
  return first
    .split(/\s+/)
    .filter(Boolean)
    .map(p => `${p[0].toUpperCase()}.`)
    .join(' ')
}

function extractYear(publishedDate?: string): string {
  if (!publishedDate) return 'n.d.'
  const m = publishedDate.match(/\b(19|20)\d{2}\b/)
  return m ? m[0] : 'n.d.'
}

function formatAccessedDate(ts: number, style: 'apa' | 'mla' | 'iso'): string {
  const d = new Date(ts || Date.now())
  if (style === 'iso') return d.toISOString().slice(0, 10)
  const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']
  const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  if (style === 'mla') {
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
  }
  return `${fullMonths[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function formatAuthorsApa(authors: string[]): string {
  if (authors.length === 0) return ''
  const formatted = authors.map(a => {
    const { first, last } = splitAuthorName(a)
    return first ? `${last}, ${toInitials(first)}` : last
  })
  if (formatted.length === 1) return formatted[0]
  if (formatted.length === 2) return `${formatted[0]}, & ${formatted[1]}`
  if (formatted.length <= 20) {
    return `${formatted.slice(0, -1).join(', ')}, & ${formatted[formatted.length - 1]}`
  }
  return `${formatted.slice(0, 19).join(', ')}, ... ${formatted[formatted.length - 1]}`
}

function formatAuthorsMla(authors: string[]): string {
  if (authors.length === 0) return ''
  const first = splitAuthorName(authors[0])
  const lead = first.first ? `${first.last}, ${first.first}` : first.last
  if (authors.length === 1) return lead
  if (authors.length === 2) {
    const second = splitAuthorName(authors[1])
    const sName = second.first ? `${second.first} ${second.last}` : second.last
    return `${lead}, and ${sName}`
  }
  return `${lead}, et al.`
}

function formatAuthorsIeee(authors: string[]): string {
  if (authors.length === 0) return ''
  const formatted = authors.map(a => {
    const { first, last } = splitAuthorName(a)
    return first ? `${toInitials(first)} ${last}` : last
  })
  if (formatted.length === 1) return formatted[0]
  if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`
  if (formatted.length <= 6) {
    return `${formatted.slice(0, -1).join(', ')}, and ${formatted[formatted.length - 1]}`
  }
  return `${formatted[0]} et al.`
}

export function formatCitation(bm: BrainBookmark, style: CitationStyle): string {
  const meta = bm.citationMeta
  const authors = meta?.authors?.filter(Boolean) ?? []
  const year = extractYear(meta?.publishedDate)
  const title = (bm.title || 'Untitled').trim().replace(/\.$/, '')
  const venue = meta?.journal || meta?.siteName || getDomain(bm.url)
  const doiUrl = meta?.doi ? `https://doi.org/${meta.doi}` : bm.url

  if (style === 'apa') {
    const authorPart = formatAuthorsApa(authors)
    const volIssue = meta?.volume
      ? `${meta.volume}${meta.issue ? `(${meta.issue})` : ''}`
      : ''
    const details = [venue, volIssue, meta?.pages].filter(Boolean).join(', ')
    if (authorPart) {
      return `${authorPart} (${year}). ${title}. ${details ? `${details}. ` : ''}${doiUrl}`
    }
    return `${title}. (${year}). ${venue ? `${venue}. ` : ''}${doiUrl}`
  }

  if (style === 'mla') {
    const authorPart = formatAuthorsMla(authors)
    const parts = [
      authorPart ? `${authorPart}.` : '',
      `"${title}."`,
      venue ? `${venue},` : '',
      meta?.volume ? `vol. ${meta.volume},` : '',
      meta?.issue ? `no. ${meta.issue},` : '',
      year !== 'n.d.' ? `${year},` : '',
      meta?.pages ? `pp. ${meta.pages},` : '',
      `${doiUrl}.`,
      `Accessed ${formatAccessedDate(bm.addedAt, 'mla')}.`,
    ].filter(Boolean)
    return parts.join(' ').replace(/\s+/g, ' ').trim()
  }

  if (style === 'chicago') {
    const authorPart = formatAuthorsMla(authors)
    const volPart = meta?.volume
      ? ` ${meta.volume}${meta.issue ? `, no. ${meta.issue}` : ''}`
      : ''
    const datePart = year !== 'n.d.' ? ` (${year})` : ''
    const pagePart = meta?.pages ? `: ${meta.pages}` : ''
    const pub = `${venue}${volPart}${datePart}${pagePart}`.trim()
    return `${authorPart ? `${authorPart}. ` : ''}"${title}." ${pub ? `${pub}. ` : ''}${doiUrl}.`
  }

  if (style === 'ieee') {
    const authorPart = formatAuthorsIeee(authors)
    const parts = [
      authorPart ? `${authorPart},` : '',
      `"${title},"`,
      venue ? `${venue},` : '',
      meta?.volume ? `vol. ${meta.volume},` : '',
      meta?.issue ? `no. ${meta.issue},` : '',
      meta?.pages ? `pp. ${meta.pages},` : '',
      year !== 'n.d.' ? `${year}.` : '',
      `[Online]. Available: ${doiUrl}`,
    ].filter(Boolean)
    return parts.join(' ').replace(/\s+/g, ' ').trim()
  }

  // BibTeX
  const leadLast = authors.length > 0
    ? splitAuthorName(authors[0]).last.toLowerCase().replace(/[^a-z0-9]/g, '')
    : (getDomain(bm.url).split('.')[0] || 'ref').replace(/[^a-z0-9]/g, '')
  const yearKey = year === 'n.d.' ? 'nd' : year
  const firstWord = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).find(w => w.length > 2) || 'work'
  const citeKey = `${leadLast || 'ref'}${yearKey}${firstWord}`
  const isArticle = Boolean(meta?.journal || meta?.doi || meta?.arxivId)

  const lines = [
    `@${isArticle ? 'article' : 'misc'}{${citeKey},`,
    authors.length > 0 ? `  author = {${authors.join(' and ')}},` : '',
    `  title = {{${title}}},`,
    meta?.journal
      ? `  journal = {${meta.journal}},`
      : venue
      ? `  howpublished = {${venue}},`
      : '',
    year !== 'n.d.' ? `  year = {${year}},` : '',
    meta?.volume ? `  volume = {${meta.volume}},` : '',
    meta?.issue ? `  number = {${meta.issue}},` : '',
    meta?.pages ? `  pages = {${meta.pages}},` : '',
    meta?.doi ? `  doi = {${meta.doi}},` : '',
    meta?.arxivId ? `  eprint = {${meta.arxivId}},` : '',
    `  url = {${bm.url}},`,
    `  note = {Accessed: ${formatAccessedDate(bm.addedAt, 'iso')}}`,
    `}`,
  ].filter(Boolean)

  return lines.join('\n')
}

export function formatBibliography(bookmarks: BrainBookmark[], style: CitationStyle): string {
  if (style === 'bibtex') {
    return bookmarks.map(bm => formatCitation(bm, 'bibtex')).join('\n\n')
  }
  const entries = bookmarks.map(bm => formatCitation(bm, style))
  if (style === 'ieee') {
    return entries.map((entry, idx) => `[${idx + 1}] ${entry}`).join('\n\n')
  }
  return entries.sort((a, b) => a.localeCompare(b)).join('\n\n')
}
