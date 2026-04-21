// Injects a toast via Shadow DOM when visiting a saved bookmark
import type { BrainBookmark } from '../types'

const TOAST_AUTO_DISMISS_MS = 5000

function injectToast(bookmark: BrainBookmark) {
  // Remove any existing toast
  document.querySelector('#contextos-toast-host')?.remove()

  const host = document.createElement('div')
  host.id = 'contextos-toast-host'
  document.body.appendChild(host)

  const shadow = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      background: linear-gradient(135deg, #1a1a35 0%, #0f0f23 100%);
      border: 1px solid #2a2a4a;
      border-radius: 14px;
      padding: 14px 16px;
      max-width: 340px;
      min-width: 260px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.2);
      animation: slideIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards;
      color: #e2e8f0;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .toast.dismiss {
      animation: slideOut 0.3s ease-in forwards;
    }
    @keyframes slideOut {
      from { opacity: 1; transform: translateY(0); }
      to   { opacity: 0; transform: translateY(20px); }
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .favicon {
      width: 18px;
      height: 18px;
      border-radius: 4px;
    }
    .brand {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #818cf8;
    }
    .close-btn {
      margin-left: auto;
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 0 2px;
      transition: color 0.15s;
    }
    .close-btn:hover { color: #e2e8f0; }
    .note {
      font-size: 13px;
      line-height: 1.5;
      color: #cbd5e1;
      margin-bottom: 10px;
    }
    .note strong { color: #fff; }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-bottom: 10px;
    }
    .tag {
      background: rgba(99,102,241,0.15);
      color: #a5b4fc;
      border: 1px solid rgba(99,102,241,0.3);
      border-radius: 99px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 500;
    }
    .actions {
      display: flex;
      gap: 8px;
    }
    .btn {
      flex: 1;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
    }
    .btn-primary {
      background: #6366f1;
      color: #fff;
    }
    .btn-primary:hover { background: #4f46e5; }
    .btn-ghost {
      background: rgba(255,255,255,0.06);
      color: #94a3b8;
    }
    .btn-ghost:hover { background: rgba(255,255,255,0.1); }
  `

  const toast = document.createElement('div')
  toast.className = 'toast'

  const domain = (() => {
    try { return new URL(bookmark.url).hostname } catch { return '' }
  })()

  toast.innerHTML = `
    <div class="header">
      <img class="favicon" src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" alt="" onerror="this.style.display='none'"/>
      <span class="brand">🧠 Contextos</span>
      <button class="close-btn" id="bm-close">×</button>
    </div>
    <div class="note">
      <strong>You saved this because:</strong><br/>
      ${bookmark.note || '<em style="color:#64748b">No note yet — click Edit to add one.</em>'}
    </div>
    ${bookmark.tags.length
      ? `<div class="tags">${bookmark.tags.map((t) => `<span class="tag">#${t}</span>`).join('')}</div>`
      : ''
    }
    <div class="actions">
      <button class="btn btn-primary" id="bm-edit">Edit note</button>
      <button class="btn btn-ghost" id="bm-dismiss">Dismiss</button>
    </div>
  `

  shadow.appendChild(style)
  shadow.appendChild(toast)

  let timer: ReturnType<typeof setTimeout>

  function dismiss() {
    clearTimeout(timer)
    toast.classList.add('dismiss')
    setTimeout(() => host.remove(), 350)
  }

  shadow.getElementById('bm-close')?.addEventListener('click', dismiss)
  shadow.getElementById('bm-dismiss')?.addEventListener('click', dismiss)
  shadow.getElementById('bm-edit')?.addEventListener('click', () => {
    // Open extension popup via clicking the browser action
    chrome.runtime.sendMessage({ type: 'OPEN_POPUP' }).catch(() => {})
    dismiss()
  })

  timer = setTimeout(dismiss, TOAST_AUTO_DISMISS_MS)
}

function urlsMatch(a: string, b: string): boolean {
  try {
    const ua = new URL(a)
    const ub = new URL(b)
    // Match on hostname + pathname only (ignore hash, query params)
    return ua.hostname === ub.hostname &&
      ua.pathname.replace(/\/$/, '') === ub.pathname.replace(/\/$/, '')
  } catch {
    return false
  }
}

function init() {
  const currentUrl = location.href

  chrome.runtime.sendMessage({ type: 'GET_BOOKMARKS' }, (response) => {
    if (chrome.runtime.lastError) return // Extension context invalidated
    if (!response?.success || !Array.isArray(response.data)) return
    const bookmarks = response.data as BrainBookmark[]
    const match = bookmarks.find((b) => urlsMatch(b.url, currentUrl))
    // Show toast whether or not there's a note
    if (match) injectToast(match)
  })
}

// Listen for background-initiated toasts (new bookmark just saved)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SHOW_TOAST' && msg.payload) {
    injectToast(msg.payload as BrainBookmark)
  }
})

init()
