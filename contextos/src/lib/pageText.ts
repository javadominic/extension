import type { CitationMetadata } from '../types'

export interface ActiveTabPageData {
  text: string
  citationMeta?: CitationMetadata
  quote?: string
}

/**
 * Safely extracts page text, academic citation metadata, and selected quote from the active tab.
 * Scans all windows to find the first real http/https tab when called from a popup/service worker.
 */
export async function getActiveTabPageData(): Promise<ActiveTabPageData> {
  try {
    let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    let tab = tabs.find(t => t.url && /^https?:\/\//.test(t.url))

    if (!tab) {
      tabs = await chrome.tabs.query({ active: true })
      tab = tabs.find(t => t.url && /^https?:\/\//.test(t.url))
    }

    if (!tab?.id || !tab.url) return { text: '' }

    const nonInjectablePatterns = [
      /^chrome:\/\//,
      /^chrome-extension:\/\//,
      /^about:/,
      /^data:/,
      /\.pdf(\?.*)?$/i,
      /^https?:\/\/(newtab|new-tab)/,
    ]
    if (nonInjectablePatterns.some(p => p.test(tab!.url!))) return { text: '' }

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_TEXT' })
    return {
      text: response?.text ?? '',
      citationMeta: response?.citationMeta,
      quote: response?.quote || undefined,
    }
  } catch {
    return { text: '' }
  }
}

export async function getActiveTabText(): Promise<string> {
  const data = await getActiveTabPageData()
  return data.text
}
