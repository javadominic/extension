import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { suggestNote, autoTag } from '../lib/gemini'
import { getActiveTabText } from '../lib/pageText'
import {
  getSettings,
  getCachedBookmarks,
  upsertBookmark,
  removeBookmark,
  saveFirebaseToken,
  setPendingEdit,
} from '../lib/storage'
import { checkUrl, checkAllBookmarks } from '../lib/healthCheck'
import { chromeNodeToBookmark } from '../lib/bookmarks'
import type { BrainBookmark, ChromeMessage, ChromeResponse } from '../types'

// import.meta.env is not available at SW runtime — values inlined at build time by Vite
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? 'AIzaSyBGTkNDcYZoYgmkDAiMA2jJ0y7UtIcxVMg',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? 'protfolio-b8314.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? 'protfolio-b8314',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? 'protfolio-b8314.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '367359110826',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? '1:367359110826:web:fad3760ce4a336c9862ad3',
}

let _app: ReturnType<typeof initializeApp> | null = null
let _db: ReturnType<typeof getFirestore> | null = null

const skipGeminiForUrls = new Set<string>()

function getDb() {
  if (!_db) {
    _app = initializeApp(firebaseConfig, 'background')
    _db = getFirestore(_app)
  }
  return _db
}

async function signInWithGoogle(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError || !token) {
        resolve(null)
        return
      }
      try {
        const app = initializeApp(firebaseConfig, `bg_auth_${Date.now()}`)
        const auth = getAuth(app)
        const credential = GoogleAuthProvider.credential(null, token)
        const result = await signInWithCredential(auth, credential)
        const idToken = await result.user.getIdToken()
        await saveFirebaseToken(idToken)
        resolve(result.user.uid)
      } catch {
        resolve(null)
      }
    })
  })
}

chrome.bookmarks.onCreated.addListener(async (id, node) => {
  if (!node.url) return
  
  if (skipGeminiForUrls.has(node.url)) {
    skipGeminiForUrls.delete(node.url)
    // Completely ignore this event! The SAVE_NEW_PAGE_WITH_NOTE handler will manually save the bookmark to cache and Firebase.
    return
  }

  const settings = await getSettings()
  const uid = settings.firebaseUid ?? ''

  const bm: BrainBookmark = chromeNodeToBookmark(node, uid)

  // Save the skeleton immediately so the popup can show it instantly
  await upsertBookmark(bm)

  if (settings.geminiApiKey) {
    const pageText = await getActiveTabText()

    bm.note = await suggestNote(bm.url, bm.title, settings.geminiApiKey, pageText)
    bm.tags = await autoTag(bm.url, bm.title, bm.note, settings.geminiApiKey, pageText)
    // Update cache with AI notes
    await upsertBookmark(bm)
  }

  if (uid) {
    try {
      const db = getDb()
      await setDoc(doc(db, 'bookmarks', uid, 'items', bm.id), bm)
    } catch {}
  }

  // Notify active tab to show toast
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  if (tabs[0]?.id) {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'SHOW_TOAST',
      payload: bm,
    }).catch(() => {})
  }
})

chrome.bookmarks.onRemoved.addListener(async (id) => {
  const settings = await getSettings()
  const uid = settings.firebaseUid ?? ''

  await removeBookmark(id)

  if (uid) {
    try {
      const db = getDb()
      await deleteDoc(doc(db, 'bookmarks', uid, 'items', id))
    } catch {}
  }
})

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('healthCheck', { periodInMinutes: 10080 }) // 1 week
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'healthCheck') return
  const settings = await getSettings()
  const bookmarks = await getCachedBookmarks()
  await checkAllBookmarks(bookmarks, settings.firebaseUid)
})

chrome.runtime.onMessage.addListener(
  (message: ChromeMessage, _sender, sendResponse: (r: ChromeResponse) => void) => {
    ;(async () => {
      try {
        switch (message.type) {
          case 'GET_BOOKMARKS': {
            const data = await getCachedBookmarks()
            sendResponse({ success: true, data })
            break
          }

          case 'SAVE_NOTE': {
            const { id, note, tags, uid } = message.payload as {
              id: string
              note: string
              tags: string[]
              uid: string
            }
            const cache = await getCachedBookmarks()
            const bm = cache.find((b: BrainBookmark) => b.id === id)
            if (bm) {
              bm.note = note
              bm.tags = tags || bm.tags
              await upsertBookmark(bm)
              if (uid) {
                try {
                  const db = getDb()
                  await setDoc(doc(db, 'bookmarks', uid, 'items', id), bm, { merge: true })
                } catch {}
              }
            }
            sendResponse({ success: true })
            break
          }

          case 'APPEND_NOTE': {
            // Appends a new remark to an existing bookmark note
            const { id: aId, newNote, uid: aUid } = message.payload as {
              id: string; newNote: string; uid: string
            }
            const cache = await getCachedBookmarks()
            const bm = cache.find((b: BrainBookmark) => b.id === aId)
            if (bm) {
              bm.note = bm.note ? `${bm.note}\n\n---\n${newNote}` : newNote
              await upsertBookmark(bm)
              if (aUid) {
                try {
                  const db = getDb()
                  await setDoc(doc(db, 'bookmarks', aUid, 'items', aId), bm, { merge: true })
                } catch {}
              }
            }
            sendResponse({ success: true })
            break
          }

          case 'GET_PAGE_TEXT': {
            // Proxy: extract page text from the real active tab (not the popup)
            const text = await getActiveTabText()
            sendResponse({ success: true, data: text })
            break
          }

          case 'CHECK_HEALTH': {
            const { url } = message.payload as { url: string }
            const status = await checkUrl(url)
            sendResponse({ success: true, data: status })
            break
          }

          case 'GET_SETTINGS': {
            const data = await getSettings()
            sendResponse({ success: true, data })
            break
          }

          case 'SIGN_IN': {
            const uid = await signInWithGoogle()
            sendResponse({ success: !!uid, data: uid })
            break
          }

          case 'OPEN_POPUP': {
            // Opens the extension popup programmatically (MV3 workaround)
            await chrome.action.openPopup().catch(() => {})
            sendResponse({ success: true })
            break
          }

          case 'ADD_BOOKMARK': {
            const { title, url } = message.payload as { title: string; url: string }
            // Create the bookmark. The onCreated listener will handle Gemini processing.
            chrome.bookmarks.create({ title, url }, async (newBookmark) => {
              // Tell the popup to open the modal for this new bookmark immediately
              await setPendingEdit(newBookmark.id)
              // Once created, immediately open the popup so the user can edit the note
              chrome.action.openPopup().catch(() => {})
            })
            sendResponse({ success: true })
            break
          }

          case 'SAVE_NEW_PAGE_WITH_NOTE': {
            const { title, url, note } = message.payload as { title: string; url: string; note: string }
            skipGeminiForUrls.add(url)
            chrome.bookmarks.create({ title, url }, async (node) => {
              // We handle the FULL bookmark creation ourselves to avoid race conditions!
              const settings = await getSettings()
              const uid = settings.firebaseUid ?? ''
              const bm = chromeNodeToBookmark(node, uid)
              bm.note = note
              
              await upsertBookmark(bm)
              if (settings.geminiApiKey) {
                const pageText = await getActiveTabText()
                bm.tags = await autoTag(bm.url, bm.title, bm.note, settings.geminiApiKey, pageText)
                await upsertBookmark(bm)
              }
              
              if (uid) {
                try {
                  const db = getDb()
                  await setDoc(doc(db, 'bookmarks', uid, 'items', node.id), bm)
                } catch {}
              }
            })
            sendResponse({ success: true })
            break
          }

          case 'SUGGEST_NOTE': {
            // All Gemini fetch() calls must go through the background worker.
            // The popup is blocked by CSP from calling external APIs directly.
            const { url: snUrl, title: snTitle } = message.payload as {
              url: string; title: string
            }
            const settings = await getSettings()
            if (!settings.geminiApiKey) {
              sendResponse({ success: false, error: 'NO_KEY' })
              break
            }
            const pageText = await getActiveTabText()
            const note = await suggestNote(snUrl, snTitle, settings.geminiApiKey, pageText)
            if (!note) {
              sendResponse({ success: false, error: 'EMPTY' })
              break
            }
            const tags = await autoTag(snUrl, snTitle, note, settings.geminiApiKey, pageText)
            sendResponse({ success: true, data: { note, tags } })
            break
          }

          case 'VALIDATE_GEMINI_KEY': {
            // Actually ping the Gemini API with the provided key and return the real error.
            const { key } = message.payload as { key: string }
            try {
              const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: 'ping' }] }],
                    generationConfig: { maxOutputTokens: 1 },
                  }),
                }
              )
              if (res.ok || res.status === 400) {
                // 400 = bad request body but key is valid; 200 = fully valid
                sendResponse({ success: true })
              } else if (res.status === 400) {
                sendResponse({ success: true })
              } else if (res.status === 403 || res.status === 401) {
                sendResponse({ success: false, error: 'Invalid API key — check it in Google AI Studio.' })
              } else if (res.status === 429) {
                sendResponse({ success: false, error: 'Rate limit hit — key is valid but quota exceeded.' })
              } else {
                const body = await res.json().catch(() => ({}))
                const msg = (body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`
                sendResponse({ success: false, error: msg })
              }
            } catch (e) {
              sendResponse({ success: false, error: `Network error: ${String(e)}` })
            }
            break
          }

          default:
            sendResponse({ success: false, error: 'Unknown message type' })
        }
      } catch (err) {
        sendResponse({ success: false, error: String(err) })
      }
    })()
    return true // Keep channel open for async response
  }
)
