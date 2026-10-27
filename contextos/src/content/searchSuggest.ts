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
    from { opacity: 0; transform: translateY(10px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes collapse {
    from { opacity: 1; transform: translateY(0) scale(1); }
    to   { opacity: 0; transform: translateY(6px) scale(0.96); }
  }

  .badge-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #161616;
    border: 1px solid rgba(232,160,52,0.4);
    border-radius: 99px;
    padding: 6px 12px 6px 8px;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    animation: fadeUp 0.4s 0.4s cubic-bezier(0.34,1.2,0.64,1) both;
    transition: border-color 0.15s, background 0.15s;
    font-size: 12px;
    font-weight: 600;
    color: #e2e8f0;
  }
  .badge-pill:hover { border-color: rgba(232,160,52,0.7); background: #1a1a1a; }

  .badge-count {
    background: rgba(232,160,52,0.2);
    color: #e8a034;
    border-radius: 99px;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    min-width: 18px;
    text-align: center;
  }

  .panel {
    background: #161616;
    border: 1px solid #2a2a2a;
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(232,160,52,0.06);
    min-width: 280px;
    max-width: 320px;
    animation: fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards;
    overflow: hidden;
  }
  .panel.collapsing { animation: collapse 0.25s ease-in forwards; }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px 14px 9px;
    border-bottom: 1px solid #222;
    cursor: grab;
  }
  .panel-header:active { cursor: grabbing; }
  .brand-text {
    font-size: 13px;
    font-weight: 700;
    color: #e8a034;
    flex: 1;
  }
  .header-close {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    font-size: 17px;
    line-height: 1;
    padding: 0 2px;
    transition: color 0.15s;
  }
  .header-close:hover { color: #e2e8f0; }

  .result-item {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 10px 14px;
    cursor: pointer;
    transition: background 0.12s;
    border-bottom: 1px solid #1e1e1e;
    text-decoration: none;
  }
  .result-item:last-child { border-bottom: none; }
  .result-item:hover { background: rgba(255,255,255,0.04); }
  .result-item:focus { outline: 2px solid rgba(232,160,52,0.5); outline-offset: -2px; }

  .result-favicon { width: 16px; height: 16px; border-radius: 3px; flex-shrink: 0; margin-top: 2px; }

  .result-body { flex: 1; min-width: 0; }
  .result-title { font-size: 12px; font-weight: 600; color: #e2e8f0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; margin-bottom: 2px; }
  .result-domain { font-size: 10px; color: #475569; margin-bottom: 3px; }
  .result-reason { font-size: 10px; color: #e8a034; font-weight: 500; }
  .result-note { font-size: 10px; color: #64748b; margin-top: 3px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

  .ext-icon { color: #475569; flex-shrink: 0; margin-top: 3px; }

  .panel-footer {
    padding: 8px 14px;
    border-top: 1px solid #1e1e1e;
    display: flex;
    gap: 6px;
    align-items: center;
    background: #111;
  }
  .mute-btn {
    font-size: 10px;
    color: #475569;
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px 0;
    transition: color 0.12s;
    font-family: 'DM Mono', system-ui, sans-serif;
  }
  .mute-btn:hover { color: #94a3b8; }
  .sep { color: #2a2a2a; font-size: 10px; }

  .privacy-note { font-size: 9px; color: #334155; margin-left: auto; }
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
  pill.innerHTML = `<span>🧠</span><span>Related saves</span><span class="badge-count">${results.length}</span>`
  wrapper.appendChild(pill)

  const panel = document.createElement('div')
  panel.className = 'panel'
  panel.style.display = 'none'
  panel.setAttribute('role', 'region')
  panel.setAttribute('aria-label', 'Related saved bookmarks')

  const headerHTML = `
    <div class="panel-header" id="ss-drag-handle" role="toolbar" aria-label="Contextos suggestions panel">
      <span>🧠</span>
      <span class="brand-text">Contextos · Related saves</span>
      <button class="header-close" id="ss-close" aria-label="Close panel">×</button>
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
        <svg class="ext-icon" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
      </a>
    `
  }).join('')

  const footerHTML = `
    <div class="panel-footer">
      <button class="mute-btn" id="ss-mute-search" title="Don't show for this search">Mute search</button>
      <span class="sep">·</span>
      <button class="mute-btn" id="ss-mute-site" title="Don't show on this site">Mute site</button>
      <span class="privacy-note">🔒 Local only</span>
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
