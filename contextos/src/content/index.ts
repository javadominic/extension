import type { BrainBookmark } from '../types'

const TOAST_AUTO_DISMISS_MS = 5000

const SHARED_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Mono', system-ui, sans-serif; }

  .badge {
    position: fixed;
    z-index: 2147483647;
    cursor: grab;
    user-select: none;
    transition: opacity 0.2s, transform 0.15s;
  }
  .badge:active { cursor: grabbing; }
  .badge.dragging { transition: none; opacity: 0.85; }

  .badge-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #181612;
    border: 1px solid #2C2820;
    border-radius: 8px;
    padding: 6px 12px 6px 10px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    animation: popIn 0.25s ease-out forwards;
    color: #F3EEE4;
    font-size: 12px;
    font-weight: 500;
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

  @keyframes popIn {
    from { opacity: 0; transform: scale(0.92); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideOut {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(8px); }
  }

  .panel {
    position: fixed;
    z-index: 2147483647;
    background: #181612;
    border: 1px solid #2C2820;
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.6);
    animation: slideIn 0.25s ease-out forwards;
    max-width: 320px;
    min-width: 260px;
    color: #F3EEE4;
    user-select: none;
  }
  .panel.dismiss { animation: slideOut 0.2s ease-in forwards; }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid #2C2820;
    background: #14120E;
    cursor: grab;
  }
  .panel-header:active { cursor: grabbing; }

  .brand {
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    font-size: 15px;
    font-weight: 400;
    color: #E5A53A;
    flex: 1;
  }
  .favicon { width: 15px; height: 15px; border-radius: 3px; }

  .close-btn {
    background: none;
    border: none;
    color: #958D7D;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: color 0.15s, background-color 0.15s;
    flex-shrink: 0;
  }
  .close-btn:hover { color: #F3EEE4; background: rgba(243,238,228,0.06); }

  .panel-body { padding: 10px 12px; }

  .note-card {
    background: #211E18;
    border: 1px solid #2C2820;
    border-radius: 6px;
    padding: 8px 10px;
    margin-bottom: 6px;
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .note-card-num { color: #E5A53A; font-size: 10px; font-weight: 600; font-variant-numeric: tabular-nums; margin-top: 2px; flex-shrink: 0; }
  .note-card-text { font-size: 11px; line-height: 1.5; color: #B3AB9B; white-space: pre-wrap; word-break: break-word; }

  .panel-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-top: 1px solid #2C2820;
    background: #14120E;
    gap: 8px;
  }
  .btn-edit {
    flex: 1;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    background: #E5A53A;
    color: #0F0E0C;
    transition: background 0.15s;
  }
  .btn-edit:hover { background: #D49429; }
  .btn-dismiss {
    background: none;
    border: none;
    color: #958D7D;
    font-size: 11px;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    transition: color 0.15s, background-color 0.15s;
    font-family: 'DM Mono', system-ui, sans-serif;
  }
  .btn-dismiss:hover { color: #F3EEE4; background: rgba(243,238,228,0.06); }

  .note-input {
    width: 100%;
    height: 64px;
    background: #211E18;
    border: 1px solid #2C2820;
    color: #F3EEE4;
    border-radius: 6px;
    padding: 8px;
    font-size: 11px;
    resize: none;
    margin-bottom: 8px;
    outline: none;
    transition: border-color 0.15s;
    font-family: 'DM Mono', system-ui, sans-serif;
  }
  .note-input:focus { border-color: #E5A53A; }

  .unsaved-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #181612;
    border: 1px solid #2C2820;
    border-radius: 8px;
    padding: 6px 10px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    animation: popIn 0.25s ease-out forwards;
    cursor: pointer;
    transition: border-color 0.15s, background-color 0.15s;
  }
  .unsaved-pill:hover { border-color: #3D372E; background: #211E18; }
  .unsaved-pill-close {
    background: none;
    border: none;
    color: #958D7D;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    border-radius: 4px;
    transition: color 0.15s, background-color 0.15s;
  }
  .unsaved-pill-close:hover { color: #F3EEE4; background: rgba(243,238,228,0.06); }

  .unsaved-panel {
    position: fixed;
    z-index: 2147483647;
    background: #181612;
    border: 1px solid #2C2820;
    border-radius: 10px;
    padding: 12px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.6);
    animation: slideIn 0.25s ease-out forwards;
    max-width: 300px;
    min-width: 240px;
    color: #F3EEE4;
  }
  .unsaved-panel-label { font-size: 11px; color: #958D7D; display: block; margin-bottom: 6px; }

`

const CORNER_POSITIONS = ['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const
type Corner = typeof CORNER_POSITIONS[number]

function cornerToStyle(corner: Corner, offset = 20): { [k: string]: string } {
  const map: Record<Corner, [string, string, string, string]> = {
    'bottom-right': ['auto', `${offset}px`, `${offset}px`, 'auto'],
    'bottom-left':  ['auto', 'auto',        `${offset}px`, `${offset}px`],
    'top-right':    [`${offset}px`, `${offset}px`, 'auto', 'auto'],
    'top-left':     [`${offset}px`, 'auto', 'auto', `${offset}px`],
  }
  const [top, right, bottom, left] = map[corner]
  return { top, right, bottom, left }
}

function nearestCorner(x: number, y: number, el: HTMLElement): Corner {
  const w = window.innerWidth
  const h = window.innerHeight
  const cx = x + el.offsetWidth / 2
  const cy = y + el.offsetHeight / 2
  const right  = cx > w / 2
  const bottom = cy > h / 2
  if (bottom && right)  return 'bottom-right'
  if (bottom && !right) return 'bottom-left'
  if (!bottom && right) return 'top-right'
  return 'top-left'
}

function applyCorner(el: HTMLElement, corner: Corner) {
  const style = cornerToStyle(corner)
  el.style.top    = style.top
  el.style.right  = style.right
  el.style.bottom = style.bottom
  el.style.left   = style.left
}

async function getSavedCorner(hostname: string): Promise<Corner> {
  const key = `ctx_corner_${hostname}`
  const res = await chrome.storage.local.get(key)
  return (res[key] as Corner) ?? 'bottom-right'
}

async function saveCorner(hostname: string, corner: Corner) {
  await chrome.storage.local.set({ [`ctx_corner_${hostname}`]: corner })
}

function makeDraggable(el: HTMLElement, hostname: string, onCornerChange?: (c: Corner) => void) {
  let dragging = false
  let startX = 0; let startY = 0; let origLeft = 0; let origTop = 0

  el.addEventListener('mousedown', e => {
    if ((e.target as HTMLElement).tagName === 'BUTTON' ||
        (e.target as HTMLElement).tagName === 'TEXTAREA' ||
        (e.target as HTMLElement).tagName === 'INPUT') return

    dragging = true
    el.classList.add('dragging')

    const rect = el.getBoundingClientRect()
    el.style.right  = 'auto'
    el.style.bottom = 'auto'
    el.style.left   = `${rect.left}px`
    el.style.top    = `${rect.top}px`

    startX = e.clientX - rect.left
    startY = e.clientY - rect.top
    origLeft = rect.left
    origTop  = rect.top

    e.preventDefault()
  })

  document.addEventListener('mousemove', e => {
    if (!dragging) return
    el.style.left = `${e.clientX - startX}px`
    el.style.top  = `${e.clientY - startY}px`
  })

  document.addEventListener('mouseup', e => {
    if (!dragging) return
    dragging = false
    el.classList.remove('dragging')

    const corner = nearestCorner(e.clientX - startX, e.clientY - startY, el)
    applyCorner(el, corner)
    saveCorner(hostname, corner)
    onCornerChange?.(corner)
  })
}

function createHost() {
  document.querySelector('#contextos-toast-host')?.remove()
  const host = document.createElement('div')
  host.id = 'contextos-toast-host'
  document.body.appendChild(host)
  return host
}

function injectUnsavedWidget(existingBookmark?: BrainBookmark) {
  const host   = createHost()
  const shadow = host.attachShadow({ mode: 'open' })
  const style  = document.createElement('style')
  style.textContent = SHARED_STYLE
  shadow.appendChild(style)

  const hostname = location.hostname

  const hasNote = existingBookmark?.note &&
    !existingBookmark.note.startsWith('Interesting') &&
    !existingBookmark.note.startsWith('Saved')
  const labelText = hasNote
    ? 'Add another remark'
    : existingBookmark ? 'Add remark' : 'Save page'

  const pill = document.createElement('div')
  pill.className = 'badge'
  pill.innerHTML = `
    <div class="unsaved-pill" id="unsaved-pill-inner">
      <span class="badge-dot"></span>
      <span style="font-size:11px; font-weight:500; color:#F3EEE4;">${labelText}</span>
      <button class="unsaved-pill-close" id="unsaved-pill-close" aria-label="Dismiss">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
  `
  shadow.appendChild(pill)

  getSavedCorner(hostname).then(corner => {
    applyCorner(pill, corner)
  })
  makeDraggable(pill, hostname)

  let dismissTimer = setTimeout(dismissPill, TOAST_AUTO_DISMISS_MS)

  function dismissPill() {
    clearTimeout(dismissTimer)
    host.remove()
  }

  shadow.getElementById('unsaved-pill-close')?.addEventListener('click', e => {
    e.stopPropagation()
    dismissPill()
  })

  shadow.getElementById('unsaved-pill-inner')?.addEventListener('click', e => {
    if ((e.target as HTMLElement).id === 'unsaved-pill-close') return
    clearTimeout(dismissTimer)
    showEditPanel()
    host.remove()
  })

  function showEditPanel() {
    const eHost   = createHost()
    const eShadow = eHost.attachShadow({ mode: 'open' })
    const eStyle  = document.createElement('style')
    eStyle.textContent = SHARED_STYLE
    eShadow.appendChild(eStyle)

    const panel = document.createElement('div')
    panel.className = 'unsaved-panel badge'
    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;cursor:grab;">
        <span class="badge-dot"></span>
        <span class="brand" style="font-size:14px;">Contextos</span>
        <button class="close-btn" id="ep-close" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <label class="unsaved-panel-label">Why are you saving this?</label>
      <textarea id="ep-note" class="note-input" placeholder="Add a personal note…"></textarea>
      <div style="display:flex;gap:8px;">
        <button class="btn-edit" id="ep-save" style="flex:1;">Save note</button>
      </div>
    `
    eShadow.appendChild(panel)

    getSavedCorner(hostname).then(corner => applyCorner(panel, corner))
    makeDraggable(panel, hostname)

    const noteInput = eShadow.getElementById('ep-note') as HTMLTextAreaElement
    noteInput?.focus()

    eShadow.getElementById('ep-close')?.addEventListener('click', () => eHost.remove())

    eShadow.getElementById('ep-save')?.addEventListener('click', () => {
      const note  = noteInput?.value.trim() ?? ''
      const title = document.title
      const url   = location.href
      const saveBtn = eShadow.getElementById('ep-save') as HTMLButtonElement
      saveBtn.textContent = 'Saving…'
      saveBtn.style.opacity = '0.7'

      if (existingBookmark) {
        chrome.runtime.sendMessage({ type: 'APPEND_NOTE', payload: { id: existingBookmark.id, newNote: note, uid: existingBookmark.uid } }, () => {
          panel.innerHTML = `<div style="text-align:center;color:#E5A53A;font-size:12px;font-weight:500;padding:12px;">Note saved</div>`
          setTimeout(() => eHost.remove(), 1500)
        })
      } else {
        chrome.runtime.sendMessage({ type: 'SAVE_NEW_PAGE_WITH_NOTE', payload: { title, url, note } }, () => {
          panel.innerHTML = `<div style="text-align:center;color:#E5A53A;font-size:12px;font-weight:500;padding:12px;">Page saved</div>`
          setTimeout(() => eHost.remove(), 1500)
        })
      }
    })
  }
}

function injectToast(bookmark: BrainBookmark, onDismissed?: () => void) {
  const host   = createHost()
  const shadow = host.attachShadow({ mode: 'open' })
  const style  = document.createElement('style')
  style.textContent = SHARED_STYLE
  shadow.appendChild(style)

  const hostname = location.hostname

  const domain = (() => { try { return new URL(bookmark.url).hostname } catch { return '' } })()

  const noteEntries = bookmark.note
    ? bookmark.note.split(/\n\n---\n/).map(n => n.trim()).filter(Boolean)
    : []

  const notesHTML = noteEntries.length > 0
    ? noteEntries.map((n, i) => `
        <div class="note-card">
          <span class="note-card-num">#${i + 1}</span>
          <span class="note-card-text">${n.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>
        </div>
      `).join('')
    : `<p style="font-size:11px;color:#958D7D;padding:2px 0;">No note recorded.</p>`

  const panel = document.createElement('div')
  panel.className = 'panel badge'
  panel.innerHTML = `
    <div class="panel-header" id="panel-drag-handle">
      <img class="favicon" src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" alt="" onerror="this.style.display='none'"/>
      <span class="brand">Contextos</span>
      <button class="close-btn" id="panel-close" aria-label="Close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="panel-body">${notesHTML}</div>
    <div class="panel-footer">
      <button class="btn-edit" id="panel-edit">Edit note</button>
      <button class="btn-dismiss" id="panel-dismiss">Dismiss</button>
    </div>
  `
  shadow.appendChild(panel)

  getSavedCorner(hostname).then(corner => applyCorner(panel, corner))
  makeDraggable(panel, hostname)

  let timer: ReturnType<typeof setTimeout>

  function dismiss() {
    clearTimeout(timer)
    panel.classList.add('dismiss')
    setTimeout(() => {
      host.remove()
      onDismissed?.()
    }, 350)
  }

  shadow.getElementById('panel-close')?.addEventListener('click', dismiss)
  shadow.getElementById('panel-dismiss')?.addEventListener('click', dismiss)
  shadow.getElementById('panel-edit')?.addEventListener('click', () => {
    chrome.storage.local.set({ pending_edit: bookmark.id }, () => {
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' }).catch(() => { })
    })
    dismiss()
  })

  timer = setTimeout(dismiss, TOAST_AUTO_DISMISS_MS)
}

function urlsMatch(a: string, b: string): boolean {
  try {
    const ua = new URL(a)
    const ub = new URL(b)
    return ua.hostname === ub.hostname &&
      ua.pathname.replace(/\/$/, '') === ub.pathname.replace(/\/$/, '') &&
      ua.search === ub.search
  } catch { return false }
}

function init() {
  const currentUrl = location.href

  chrome.runtime.sendMessage({ type: 'GET_BOOKMARKS' }, response => {
    if (chrome.runtime.lastError || !response?.success || !Array.isArray(response.data)) return

    const bookmarks = response.data as BrainBookmark[]
    const match = bookmarks.find(b => urlsMatch(b.url, currentUrl))

    if (match) {
      if (match.health !== 'alive') {
        chrome.runtime.sendMessage({ type: 'MARK_ALIVE', payload: { id: match.id } })
      }

      if (match.note) {
        const isDefault = match.note.startsWith('Interesting ') || match.note.startsWith('Saved for ')
        if (!isDefault) {
          injectToast(match, () => { injectUnsavedWidget(match) })
          return
        }
      }
      injectUnsavedWidget(match)
    } else {
      injectUnsavedWidget()
    }
  })
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SHOW_TOAST' && msg.payload) {
    injectToast(msg.payload as BrainBookmark)
  } else if (msg.type === 'EXTRACT_TEXT') {
    const text = (document.body?.innerText || document.documentElement?.innerText || '').substring(0, 5000)
    sendResponse({ text })
  }
})

init()
