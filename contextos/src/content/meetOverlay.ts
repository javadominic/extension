// Floating panel with relevant bookmarks for current meeting
import type { BrainBookmark } from '../types'

let panel: HTMLDivElement | null = null
let shadow: ShadowRoot | null = null
let isDragging = false
let dragOffset = { x: 0, y: 0 }

const PANEL_STYLE = `
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Mono', system-ui, sans-serif; }

  .panel {
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 280px;
    background: #161616;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(232,160,52,0.1);
    z-index: 2147483647;
    color: #e2e8f0;
    overflow: hidden;
    animation: fadeIn 0.4s ease forwards;
    cursor: default;
    user-select: none;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1); }
  }
  .panel-header {
    display: flex;
    align-items: center;
    padding: 12px 14px;
    background: rgba(255,255,255,0.02);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    cursor: grab;
  }
  .panel-header:active { cursor: grabbing; }
  .panel-title {
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    font-size: 18px;
    font-weight: 400;
    color: #e8a034;
    flex: 1;
  }
  .icon-btn {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    font-size: 16px;
    padding: 2px 4px;
    border-radius: 4px;
    transition: all 0.15s;
  }
  .icon-btn:hover { color: #e2e8f0; background: rgba(255,255,255,0.08); }
  .panel-body {
    max-height: 320px;
    overflow-y: auto;
    padding: 8px 0;
    scrollbar-width: thin;
    scrollbar-color: rgba(232,160,52,0.3) transparent;
  }
  .panel-body.minimized { display: none; }
  .bm-item {
    display: flex;
    align-items: start;
    gap: 10px;
    padding: 10px 14px;
    cursor: pointer;
    transition: background 0.15s;
    border-radius: 0;
  }
  .bm-item:hover { background: rgba(255,255,255,0.04); }
  .favicon { width: 16px; height: 16px; border-radius: 3px; flex-shrink: 0; margin-top: 2px; }
  .bm-info { flex: 1; min-width: 0; }
  .bm-title {
    font-size: 12px;
    font-weight: 600;
    color: #e2e8f0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bm-note {
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .empty-state {
    padding: 24px 14px;
    text-align: center;
    color: #475569;
    font-size: 12px;
  }
  .quick-save {
    display: flex;
    gap: 8px;
    padding: 10px 14px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .save-btn {
    flex: 1;
    padding: 7px;
    background: #e8a034;
    color: #0c0c0c;
    border: none;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .save-btn:hover { background: #d08c2a; }
`

function buildPanel(bookmarks: BrainBookmark[]) {
  const host = document.createElement('div')
  host.id = 'contextos-meet-panel-host'
  document.body.appendChild(host)
  shadow = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&display=swap');
    ${PANEL_STYLE}
  `

  panel = document.createElement('div')
  panel.className = 'panel'

  const relevant = bookmarks.slice(0, 8)

  panel.innerHTML = `
    <div class="panel-header" id="bm-drag-handle">
      <span class="panel-title">🧠 Contextos</span>
      <button class="icon-btn" id="bm-minimize" title="Minimize">—</button>
      <button class="icon-btn" id="bm-close-panel" title="Close">×</button>
    </div>
    <div class="panel-body" id="bm-panel-body">
      ${relevant.length
        ? relevant.map((bm) => {
            const domain = (() => { try { return new URL(bm.url).hostname } catch { return '' } })()
            return `
              <div class="bm-item" data-url="${bm.url}">
                <img class="favicon" src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" alt="" onerror="this.style.display='none'"/>
                <div class="bm-info">
                  <div class="bm-title">${bm.title}</div>
                  <div class="bm-note">${bm.note || 'No note'}</div>
                </div>
              </div>
            `
          }).join('')
        : '<div class="empty-state">No relevant bookmarks found for this meeting.</div>'
      }
    </div>
    <div class="quick-save">
      <button class="save-btn" id="bm-quick-save">＋ Save this page</button>
    </div>
  `

  shadow.appendChild(style)
  shadow.appendChild(panel)

  // Event bindings
  const body = shadow.getElementById('bm-panel-body')!
  let minimized = false

  shadow.getElementById('bm-minimize')?.addEventListener('click', () => {
    minimized = !minimized
    body.classList.toggle('minimized', minimized)
    const btn = shadow!.getElementById('bm-minimize')!
    btn.textContent = minimized ? '▲' : '—'
  })

  shadow.getElementById('bm-close-panel')?.addEventListener('click', () => {
    host.remove()
  })

  shadow.getElementById('bm-quick-save')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      type: 'ADD_BOOKMARK',
      payload: { title: document.title, url: location.href }
    })
  })

  // Click bookmark items
  shadow.querySelectorAll('.bm-item').forEach((el) => {
    el.addEventListener('click', () => {
      const url = (el as HTMLElement).dataset.url
      if (url) window.open(url, '_blank')
    })
  })

  // Dragging
  const handle = shadow.getElementById('bm-drag-handle')!
  handle.addEventListener('mousedown', (e: Event) => {
    const me = e as MouseEvent
    isDragging = true
    const rect = panel!.getBoundingClientRect()
    dragOffset = { x: me.clientX - rect.left, y: me.clientY - rect.top }
  })

  document.addEventListener('mousemove', (me: MouseEvent) => {
    if (!isDragging || !panel) return
    panel.style.left = `${me.clientX - dragOffset.x}px`
    panel.style.top  = `${me.clientY - dragOffset.y}px`
    panel.style.right  = 'auto'
    panel.style.bottom = 'auto'
  })

  document.addEventListener('mouseup', () => { isDragging = false })
}

function init() {
  if (document.getElementById('contextos-meet-panel-host')) return

  chrome.runtime.sendMessage({ type: 'GET_BOOKMARKS' }, (response) => {
    if (!response?.success || !Array.isArray(response.data)) {
      buildPanel([])
      return
    }
    const all = response.data as BrainBookmark[]
    // Filter out bookmarks that don't have a real custom note
    const relevant = all.filter(bm => {
      if (!bm.note) return false
      const isDefault = bm.note.startsWith('Interesting ') || bm.note.startsWith('Saved for ')
      return !isDefault
    })
    buildPanel(relevant)
  })
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
