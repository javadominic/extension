import type { BrainBookmark, SearchSuggestSettings, MatchResult } from '../types'

const SEARCH_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }

  :host { font-family: 'DM Mono', system-ui, sans-serif; }

  .wrapper {
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    pointer-events: none;
    user-select: none;
  }
  .wrapper.dragging { pointer-events: all; }
  .wrapper * { pointer-events: all; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes collapse {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(4px); }
  }

  .badge-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #181612;
    border: 1px solid #2C2820;
    border-radius: 8px;
    padding: 6px 10px;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    animation: fadeUp 0.25s ease-out both;
    transition: border-color 0.15s, background-color 0.15s;
    font-size: 12px;
    font-weight: 500;
    color: #F3EEE4;
  }
  .badge-pill:hover { border-color: #3D372E; background: #211E18; }

  .badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #E5A53A;
    flex-shrink: 0;
  }

  .badge-count {
    background: rgba(229,165,58,0.15);
    color: #E5A53A;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    padding: 1px 5px;
    min-width: 16px;
    text-align: center;
  }

  .panel {
    background: #181612;
    border: 1px solid #2C2820;
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.6);
    min-width: 280px;
    max-width: 320px;
    animation: fadeUp 0.25s ease-out forwards;
    overflow: hidden;
  }
  .panel.collapsing { animation: collapse 0.2s ease-in forwards; }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: #14120E;
    border-bottom: 1px solid #2C2820;
    cursor: grab;
  }
  .panel-header:active { cursor: grabbing; }
  .brand-text {
    font-size: 12px;
    font-weight: 600;
    color: #F3EEE4;
    flex: 1;
    letter-spacing: -0.01em;
  }
  .brand-sub {
    color: #958D7D;
    font-weight: 400;
    font-size: 11px;
  }
  .header-close {
    background: none;
    border: none;
    color: #958D7D;
    cursor: pointer;
    padding: 2px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s, background-color 0.15s;
  }
  .header-close:hover { color: #F3EEE4; background: rgba(243,238,228,0.06); }

  .result-item {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 10px 12px;
    cursor: pointer;
    transition: background-color 0.12s;
    border-bottom: 1px solid #211E18;
    text-decoration: none;
  }
  .result-item:last-child { border-bottom: none; }
  .result-item:hover { background: rgba(243,238,228,0.04); }
  .result-item:focus { outline: 1px solid #E5A53A; outline-offset: -1px; }

  .result-favicon { width: 15px; height: 15px; border-radius: 3px; flex-shrink: 0; margin-top: 2px; }

  .result-body { flex: 1; min-width: 0; }
  .result-title { font-size: 12px; font-weight: 500; color: #F3EEE4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; margin-bottom: 2px; }
  .result-domain { font-size: 10px; color: #958D7D; margin-bottom: 3px; }
  .result-reason { font-size: 10px; color: #E5A53A; font-weight: 500; }
  .result-note { font-size: 10px; color: #B3AB9B; margin-top: 3px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.35; }

  .ext-icon { color: #958D7D; flex-shrink: 0; margin-top: 3px; }

  .panel-footer {
    padding: 8px 12px;
    border-top: 1px solid #2C2820;
    display: flex;
    gap: 8px;
    align-items: center;
    background: #14120E;
  }
  .mute-btn {
    font-size: 10px;
    color: #958D7D;
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px 0;
    transition: color 0.12s;
    font-family: 'DM Mono', system-ui, sans-serif;
  }
  .mute-btn:hover { color: #F3EEE4; }
  .sep { color: #3D372E; font-size: 10px; }

  .privacy-note { font-size: 10px; color: #958D7D; margin-left: auto; }

`

let currentQuery   = ''
let lastQuery      = ''
let panelHost: HTMLElement | null = null
let settings: SearchSuggestSettings | null = null

const ENGINES: Record<string, (url: URL) => string | null> = {
  'www.google.com':    url => url.searchParams.get('q'),
  'google.com':        url => url.searchParams.get('q'),
  'www.bing.com':      url => url.searchParams.get('q'),
  'duckduckgo.com':    url => url.searchParams.get('q'),
  'search.brave.com':  url => url.searchParams.get('q'),
  'search.opera.com':  url => url.searchParams.get('q'),
}

type Corner = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

function getCornerStyles(corner: Corner): { top: string; right: string; bottom: string; left: string } {
  switch (corner) {
    case 'top-left':     return { top: '80px', left: '24px', right: 'auto', bottom: 'auto' }
    case 'bottom-left':  return { bottom: '24px', left: '24px', right: 'auto', top: 'auto' }
    case 'bottom-right': return { bottom: '24px', right: '24px', left: 'auto', top: 'auto' }
    case 'top-right':
    default:             return { top: '80px', right: '24px', left: 'auto', bottom: 'auto' }
  }
}

function getEngineKey(): 'google' | 'bing' | 'duckduckgo' | 'brave' | 'opera' | null {
  const host = location.hostname.toLowerCase()
  if (host.includes('google.'))     return 'google'
  if (host.includes('bing.com'))    return 'bing'
  if (host.includes('duckduckgo'))  return 'duckduckgo'
  if (host.includes('brave.com'))   return 'brave'
  if (host.includes('opera.com'))   return 'opera'
  return null
}

function extractQuery(): string | null {
  try {
    const url = new URL(location.href)
    return url.searchParams.get('q') || url.searchParams.get('query') || null
  } catch {
    return null
  }
}

async function loadSettings(): Promise<SearchSuggestSettings> {
  const res = await chrome.storage.sync.get('settings')
  const s = res.settings ?? {}
  return s.searchSuggest ?? {
    enabled: true,
    engines: { google: true, bing: true, duckduckgo: true, brave: true, opera: true },
    threshold: 2.5,
    badgeStyle: 'collapsed',
    mutedSearches: [],
    mutedSites: [],
  }
}

function removePanelHost() {
  panelHost?.remove()
  panelHost = null
}

function buildPanel(results: MatchResult[], query: string) {
  removePanelHost()

  const host = document.createElement('div')
  host.id = 'contextos-search-host'
  host.style.cssText = 'position: fixed; top: 0; right: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none; overflow: visible;'
  ;(document.fullscreenElement || document.body || document.documentElement).appendChild(host)
  panelHost = host

  const shadow = host.attachShadow({ mode: 'open' })
  const styleEl = document.createElement('style')
  styleEl.textContent = SEARCH_STYLE
  shadow.appendChild(styleEl)

  const cornerKey = `ctx_search_corner_${location.hostname}`

  async function getCorner(): Promise<Corner> {
    const res = await chrome.storage.local.get(cornerKey)
    const val = res[cornerKey]
    if (val === 'top-left' || val === 'bottom-left' || val === 'bottom-right' || val === 'top-right') {
      return val
    }
    return 'top-right'
  }
  async function setCorner(corner: Corner) {
    await chrome.storage.local.set({ [cornerKey]: corner })
  }

  const wrapper = document.createElement('div')
  wrapper.className = 'wrapper'
  shadow.appendChild(wrapper)

  getCorner().then(corner => {
    Object.assign(wrapper.style, getCornerStyles(corner), { position: 'fixed' })
  })

  let isExpanded = false

  const pill = document.createElement('div')
  pill.className = 'badge-pill'
  pill.setAttribute('role', 'button')
  pill.setAttribute('tabindex', '0')
  pill.setAttribute('aria-label', `${results.length} related saved bookmark${results.length > 1 ? 's' : ''}`)
  pill.innerHTML = `<span class="badge-dot"></span><span>Related saves</span><span class="badge-count">${results.length}</span>`
  wrapper.appendChild(pill)

  const panel = document.createElement('div')
  panel.className = 'panel'
  panel.style.display = 'none'
  panel.setAttribute('role', 'region')
  panel.setAttribute('aria-label', 'Related saved bookmarks')

  const headerHTML = `
    <div class="panel-header" id="ss-drag-handle" role="toolbar" aria-label="Contextos suggestions panel">
      <span class="badge-dot"></span>
      <span class="brand-text">Contextos <span class="brand-sub">· Related saves</span></span>
      <button class="header-close" id="ss-close" aria-label="Close panel">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `

  const resultsHTML = results.map((r, i) => {
    const domain = (() => { try { return new URL(r.bookmark.url).hostname } catch { return '' } })()
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    const noteSnip = r.bookmark.note
      ? `<div class="result-note">${r.bookmark.note.replace(/</g,'&lt;').replace(/>/g,'&gt;').substring(0, 80)}…</div>`
      : ''
    return `
      <a class="result-item" href="${r.bookmark.url}" target="_blank" rel="noopener noreferrer"
         id="ss-result-${i}" tabindex="0"
         aria-label="${r.bookmark.title}">
        <img class="result-favicon" src="${favicon}" alt="" onerror="this.style.display='none'" />
        <div class="result-body">
          <div class="result-title">${r.bookmark.title.replace(/</g,'&lt;')}</div>
          <div class="result-domain">${domain}</div>
          <div class="result-reason">${r.matchReason}</div>
          ${noteSnip}
        </div>
        <svg class="ext-icon" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>
        </svg>
      </a>
    `
  }).join('')

  const footerHTML = `
    <div class="panel-footer">
      <button class="mute-btn" id="ss-mute-search" title="Do not show for this search">Mute search</button>
      <span class="sep">·</span>
      <button class="mute-btn" id="ss-mute-site" title="Do not show on this site">Mute site</button>
      <span class="privacy-note">Local only</span>
    </div>
  `

  panel.innerHTML = headerHTML + `<div role="list">${resultsHTML}</div>` + footerHTML
  wrapper.appendChild(panel)

  function expandPanel() {
    if (isExpanded) return
    isExpanded = true
    pill.style.display = 'none'
    panel.style.display = 'block'
  }

  function collapsePanel() {
    isExpanded = false
    panel.classList.add('collapsing')
    setTimeout(() => {
      panel.classList.remove('collapsing')
      panel.style.display = 'none'
      pill.style.display = 'flex'
    }, 250)
  }

  if (settings?.badgeStyle === 'auto-expand') expandPanel()

  pill.addEventListener('click', expandPanel)
  pill.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') expandPanel() })

  shadow.getElementById('ss-close')?.addEventListener('click', () => {
    collapsePanel()
  })

  shadow.getElementById('ss-mute-search')?.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'MUTE_SEARCH_QUERY', payload: { query } })
    removePanelHost()
  })

  shadow.getElementById('ss-mute-site')?.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'MUTE_SEARCH_SITE', payload: { site: location.hostname } })
    removePanelHost()
  })

  // Draggable
  let dragging = false; let sx = 0; let sy = 0
  shadow.getElementById('ss-drag-handle')?.addEventListener('mousedown', e => {
    dragging = true
    wrapper.classList.add('dragging')
    const rect = wrapper.getBoundingClientRect()
    wrapper.style.right  = 'auto'; wrapper.style.bottom = 'auto'
    wrapper.style.left   = `${rect.left}px`; wrapper.style.top = `${rect.top}px`
    sx = e.clientX - rect.left; sy = e.clientY - rect.top
    e.preventDefault()
  })
  document.addEventListener('mousemove', e => {
    if (!dragging) return
    wrapper.style.left = `${e.clientX - sx}px`
    wrapper.style.top  = `${e.clientY - sy}px`
  })
  document.addEventListener('mouseup', () => {
    if (!dragging) return
    dragging = false
    wrapper.classList.remove('dragging')
    const rect = wrapper.getBoundingClientRect()
    const midX = window.innerWidth / 2
    const midY = window.innerHeight / 2
    const isRight = (rect.left + rect.width / 2) >= midX
    const isBottom = (rect.top + rect.height / 2) >= midY
    const corner: Corner = isRight ? (isBottom ? 'bottom-right' : 'top-right') : (isBottom ? 'bottom-left' : 'top-left')
    Object.assign(wrapper.style, getCornerStyles(corner))
    setCorner(corner)
  })

  // Keyboard nav between results
  panel.addEventListener('keydown', e => {
    if (e.key === 'Escape') collapsePanel()
  })
}

async function processQuery(query: string) {
  if (query === lastQuery) return
  if (query.length < 3) { removePanelHost(); return }

  const s = settings
  if (!s?.enabled) { removePanelHost(); return }

  const engineKey = getEngineKey()
  if (!engineKey || s.engines?.[engineKey] === false) { removePanelHost(); return }

  const q = query.toLowerCase().trim()
  if (s.mutedSearches.some(m => m.toLowerCase() === q)) { removePanelHost(); return }
  if (s.mutedSites.some(m => m === location.hostname)) { removePanelHost(); return }

  lastQuery = query

  const res = await chrome.runtime.sendMessage({ type: 'FIND_RELATED', payload: { query } })
  if (!res?.success || !Array.isArray(res.data) || res.data.length === 0) {
    removePanelHost()
    return
  }

  buildPanel(res.data as MatchResult[], query)
}

function onUrlChange() {
  const query = extractQuery()
  if (!query) { removePanelHost(); return }
  currentQuery = query
  processQuery(query)
}

async function init() {
  settings = await loadSettings()

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.settings?.newValue?.searchSuggest) {
      settings = changes.settings.newValue.searchSuggest
    }
  })

  if (!settings.enabled) return

  onUrlChange()

  // Watch for URL changes on SPA search engines
  const origPushState    = history.pushState.bind(history)
  const origReplaceState = history.replaceState.bind(history)

  history.pushState = (...args) => {
    origPushState(...args)
    setTimeout(onUrlChange, 100)
  }
  history.replaceState = (...args) => {
    origReplaceState(...args)
    setTimeout(onUrlChange, 100)
  }

  window.addEventListener('popstate', () => setTimeout(onUrlChange, 100))
}

init()
