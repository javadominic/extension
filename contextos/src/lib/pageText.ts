/**
 * Safely extracts page text from the active tab.
 * Returns an empty string if the tab is not injectable (e.g. chrome://, pdf, new tab).
 */
export async function getActiveTabText(): Promise<string> {
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    const tab = tabs[0]
    if (!tab?.id || !tab.url) return ''

    // Content scripts cannot be injected into these URLs
    const nonInjectablePatterns = [
      /^chrome:\/\//,
      /^chrome-extension:\/\//,
      /^about:/,
      /^data:/,
      /\.pdf(\?.*)?$/i,
      /^https?:\/\/(newtab|new-tab)/,
    ]
    const isNonInjectable = nonInjectablePatterns.some((p) => p.test(tab.url!))
    if (isNonInjectable) return ''

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_TEXT' })
    return response?.text ?? ''
  } catch {
    // Tab closed, or content script not yet injected on that page — safe to ignore
    return ''
  }
}
