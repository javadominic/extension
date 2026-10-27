/**
 * Safely extracts page text from the active tab.
 * When called from a service worker while the extension popup is open,
 * `lastFocusedWindow` resolves to the popup window (which has no injectable tab).
 * We therefore scan ALL windows to find the first real http/https tab.
 */
export async function getActiveTabText(): Promise<string> {
  try {
    // Try the active tab in the last focused window first (works when popup is not open)
    let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    let tab = tabs.find(t => t.url && /^https?:\/\//.test(t.url))

    // Fallback: scan every window for an active http/https tab
    if (!tab) {
      tabs = await chrome.tabs.query({ active: true })
      tab = tabs.find(t => t.url && /^https?:\/\//.test(t.url))
    }

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
    if (nonInjectablePatterns.some(p => p.test(tab!.url!))) return ''

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_TEXT' })
    return response?.text ?? ''
  } catch {
    // Tab closed, or content script not yet injected on that page - safe to ignore
    return ''
  }
}
