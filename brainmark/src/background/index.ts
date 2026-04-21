import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { suggestNote, autoTag } from '../lib/gemini'
import {
  getSettings,
  getCachedBookmarks,
  upsertBookmark,
  removeBookmark,
  saveFirebaseToken,
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
  const settings = await getSettings()
  const uid = settings.firebaseUid ?? ''

  const bm: BrainBookmark = chromeNodeToBookmark(node, uid)

  if (settings.geminiApiKey) {
    bm.note = await suggestNote(bm.url, bm.title, settings.geminiApiKey)
    bm.tags = await autoTag(bm.url, bm.title, bm.note, settings.geminiApiKey)
  }

  await upsertBookmark(bm)

  if (uid) {
    try {
      const db = getDb()
      await setDoc(doc(db, 'bookmarks', uid, 'items', bm.id), bm)
    } catch {}
  }

  // Notify active tab to show toast
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
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
            const { id, note, uid } = message.payload as {
              id: string
              note: string
              uid: string
            }
            const cache = await getCachedBookmarks()
            const bm = cache.find((b: BrainBookmark) => b.id === id)
            if (bm) {
              bm.note = note
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
