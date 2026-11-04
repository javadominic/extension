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
    background: #181612;
    border: 1px solid #2C2820;
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.6);
    z-index: 2147483647;
    color: #F3EEE4;
    overflow: hidden;
    animation: fadeIn 0.25s ease-out forwards;
    cursor: default;
    user-select: none;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .panel-header {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    background: #14120E;
    border-bottom: 1px solid #2C2820;
    cursor: grab;
  }
  .panel-header:active { cursor: grabbing; }
  .panel-title {
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    font-size: 16px;
    font-weight: 400;
    color: #E5A53A;
    flex: 1;
  }
  .icon-btn {
    background: none;
    border: none;
    color: #958D7D;
    cursor: pointer;
    font-size: 14px;
    padding: 2px 4px;
    border-radius: 4px;
    transition: color 0.15s, background-color 0.15s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .icon-btn:hover { color: #F3EEE4; background: rgba(243,238,228,0.06); }
  .panel-body {
    max-height: 320px;
    overflow-y: auto;
    padding: 6px 0;
    scrollbar-width: thin;
    scrollbar-color: #2C2820 transparent;
  }
  .panel-body.minimized { display: none; }
  .bm-item {
    display: flex;
    align-items: start;
    gap: 10px;
    padding: 8px 12px;
    cursor: pointer;
    transition: background-color 0.12s;
    border-radius: 0;
  }
  .bm-item:hover { background: rgba(243,238,228,0.04); }
  .favicon { width: 15px; height: 15px; border-radius: 3px; flex-shrink: 0; margin-top: 2px; }
  .bm-info { flex: 1; min-width: 0; }
  .bm-title {
    font-size: 12px;
    font-weight: 500;
    color: #F3EEE4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bm-note {
    font-size: 11px;
    color: #958D7D;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .empty-state {
    padding: 20px 12px;
    text-align: center;
    color: #958D7D;
    font-size: 11px;
  }
  .quick-save {
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    background: #14120E;
    border-top: 1px solid #2C2820;
  }
  .save-btn {
    flex: 1;
    padding: 6px 10px;
    background: #E5A53A;
    color: #0F0E0C;
    border: none;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s;
  }
  .save-btn:hover { background: #D49429; }
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
      <span class="panel-title">Contextos</span>
      <button class="icon-btn" id="bm-minimize" title="Minimize">−</button>
      <button class="icon-btn" id="bm-close-panel" title="Close">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
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
      <button class="save-btn" id="bm-quick-save">Save this page</button>
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
    btn.textContent = minimized ? '▲' : '−'
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
