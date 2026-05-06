import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, deleteDoc, getDoc, getDocs, collection, addDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
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
  saveSettings,
} from '../lib/storage'
import { checkUrl, checkAllBookmarks } from '../lib/healthCheck'
import { chromeNodeToBookmark } from '../lib/bookmarks'
import type { BrainBookmark, ChromeMessage, ChromeResponse } from '../types'

import { db, auth } from '../lib/firebase'

const skipGeminiForUrls = new Set<string>()

async function signInWithGoogle(): Promise<{uid?: string, error?: string}> {
  return new Promise((resolve) => {
    const manifest = chrome.runtime.getManifest()
    const clientId = manifest.oauth2?.client_id
    if (!clientId) {
      console.warn('OAuth2 client_id not found in manifest.json')
      resolve({ error: 'OAuth2 client_id not found in manifest.json' })
      return
    }

    const redirectUri = chrome.identity.getRedirectURL()
    const scopes = manifest.oauth2?.scopes?.join(' ') || 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
    
    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`

    chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    }, async (redirectUrl) => {
      if (chrome.runtime.lastError || !redirectUrl) {
        console.warn('launchWebAuthFlow error:', chrome.runtime.lastError?.message)
        resolve({ error: chrome.runtime.lastError?.message || 'launchWebAuthFlow failed' })
        return
      }

      try {
        const urlObj = new URL(redirectUrl)
        
        // Sometimes it's in the hash, sometimes it's in the search params
        const paramsStr = urlObj.hash ? urlObj.hash.substring(1) : urlObj.search.substring(1)
        const params = new URLSearchParams(paramsStr)
        
        const token = params.get('access_token') || params.get('id_token')
        const errorMsg = params.get('error')

        if (errorMsg) {
          console.warn('OAuth Error:', errorMsg)
          resolve({ error: `Google OAuth Error: ${errorMsg}` })
          return
        }

        if (!token) {
          console.warn('No token found in redirect URI:', redirectUrl)
          resolve({ error: `No token found. URL: ${redirectUrl}` })
          return
        }

        const id_token = params.get('id_token')
        const access_token = params.get('access_token')

        // Pass the token as the access token (2nd param). If it was an id_token, this might fail, so we try both.
        const credential = GoogleAuthProvider.credential(id_token || null, access_token || null)
        
        const result = await signInWithCredential(auth, credential)
        const idToken = await result.user.getIdToken()
        await saveFirebaseToken(idToken)
        
        // Save the raw Google tokens so we can quickly re-auth the SW if it forgets
        await chrome.storage.local.set({ 
          google_id_token: id_token || null,
          google_access_token: access_token || null 
        })
        
        resolve({ uid: result.user.uid })
      } catch (err: any) {
        console.error('Firebase Auth error during launchWebAuthFlow:', err)
        resolve({ error: `Firebase Error: ${err?.message || 'Unknown Auth Error'}` })
      }
    })
  })
}

async function ensureAuth() {
  await auth.authStateReady()
  if (auth.currentUser) return true

  // SW forgot the session (IndexedDB failure). Re-hydrate from storage.
  const data = await chrome.storage.local.get(['google_id_token', 'google_access_token'])
  if (data.google_id_token || data.google_access_token) {
    try {
      const credential = GoogleAuthProvider.credential(data.google_id_token || null, data.google_access_token || null)
      await signInWithCredential(auth, credential)
      return true
    } catch (e) {
      console.error('ensureAuth failed to re-hydrate:', e)
      return false
    }
  }
  return false
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

let aiQueue: BrainBookmark[] = []
let isAiSyncing = false
let totalAiQueueSize = 0

async function processAiQueue() {
  if (isAiSyncing) return
  isAiSyncing = true

  const settings = await getSettings()
  const apiKey = settings.geminiApiKey
  
  if (!apiKey) {
    aiQueue = []
    isAiSyncing = false
    return
  }

  while (aiQueue.length > 0) {
    const bm = aiQueue.shift()!
    const currentNum = totalAiQueueSize - aiQueue.length
    
    chrome.runtime.sendMessage({ 
      type: 'AI_SYNC_PROGRESS', 
      payload: { current: currentNum, total: totalAiQueueSize, bookmark: null } 
    }).catch(() => {})

    try {
      const note = await suggestNote(bm.url, bm.title, apiKey)
      const tags = await autoTag(bm.url, bm.title, note, apiKey)

      bm.note = note
      bm.tags = tags

      await upsertBookmark(bm)
      
      if (settings.firebaseUid) {
         try {
           await setDoc(doc(db, 'bookmarks', settings.firebaseUid, 'items', bm.id), bm, { merge: true })
         } catch (e) {}
      }

      chrome.runtime.sendMessage({ 
        type: 'AI_SYNC_PROGRESS', 
        payload: { current: currentNum, total: totalAiQueueSize, bookmark: bm } 
      }).catch(() => {})

    } catch (e) {
      console.warn(`Failed to generate AI content for ${bm.title}`, e)
    }

    if (aiQueue.length > 0) {
      await new Promise(r => setTimeout(r, 8000))
    }
  }

  totalAiQueueSize = 0
  isAiSyncing = false
  chrome.runtime.sendMessage({ 
    type: 'AI_SYNC_PROGRESS', 
    payload: { current: totalAiQueueSize, total: totalAiQueueSize, done: true } 
  }).catch(() => {})
}

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

          case 'START_AI_SYNC': {
            const { bookmarks } = message.payload as { bookmarks: BrainBookmark[] }
            aiQueue.push(...bookmarks)
            totalAiQueueSize += bookmarks.length
            processAiQueue()
            sendResponse({ success: true })
            break
          }

          case 'MARK_ALIVE': {
            const { id } = message.payload as { id: string }
            const all = await getCachedBookmarks()
            const bm = all.find(b => b.id === id)
            if (bm) {
              bm.health = 'alive'
              await upsertBookmark(bm)
              
              const settings = await getSettings()
              if (settings.firebaseUid) {
                try {
                  await setDoc(doc(db, 'bookmarks', settings.firebaseUid, 'items', bm.id), bm, { merge: true })
                } catch (e) {}
              }
            }
            sendResponse({ success: true })
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
            const result = await signInWithGoogle()
            if (result.error) {
              sendResponse({ success: false, error: result.error })
            } else if (result.uid) {
              const settings = await getSettings()
              settings.firebaseUid = result.uid
              await saveSettings(settings)
              sendResponse({ success: true, data: result.uid })
            } else {
              sendResponse({ success: false, error: 'Unknown sign-in error.' })
            }
            break
          }

          case 'CREATE_TEAM': {
            try {
              const { teamName, uid } = message.payload as { teamName: string; uid: string }
              const ref = await addDoc(collection(db, 'teams'), {
                name: teamName,
                members: [uid],
                sharedBookmarks: [],
                createdAt: serverTimestamp(),
                createdBy: uid,
              })
              sendResponse({ success: true, data: ref.id })
            } catch (err: any) {
              sendResponse({ success: false, error: err.message })
            }
            break
          }

          case 'GET_TEAM': {
            try {
              const { teamId } = message.payload as { teamId: string }
              const snap = await getDoc(doc(db, 'teams', teamId))
              if (!snap.exists()) throw new Error('Team not found')
              sendResponse({ success: true, data: { id: snap.id, ...snap.data() } })
            } catch (err: any) {
              sendResponse({ success: false, error: err.message })
            }
            break
          }

          case 'JOIN_TEAM': {
            try {
              const { joinCode, uid } = message.payload as { joinCode: string; uid: string }
              const ref = doc(db, 'teams', joinCode)
              const snap = await getDoc(ref)
              if (!snap.exists()) throw new Error('Team not found')
              await updateDoc(ref, { members: arrayUnion(uid) })
              const data = { id: snap.id, ...snap.data() }
              sendResponse({ success: true, data })
            } catch (err: any) {
              sendResponse({ success: false, error: err.message })
            }
            break
          }

          case 'SHARE_BOOKMARK': {
            try {
              const { bm, teamId, uid } = message.payload as { bm: any; teamId: string; uid: string }
              await setDoc(
                doc(db, 'teams', teamId, 'shared', bm.id),
                { ...bm, addedBy: uid, addedAt: Date.now() }
              )
              await updateDoc(doc(db, 'teams', teamId), {
                sharedBookmarks: arrayUnion(bm.id),
              })
              sendResponse({ success: true })
            } catch (err: any) {
              sendResponse({ success: false, error: err.message })
            }
            break
          }

          case 'GET_SHARED_BOOKMARKS': {
            try {
              const { teamId } = message.payload as { teamId: string }
              const snap = await getDocs(collection(db, 'teams', teamId, 'shared'))
              const items = snap.docs.map(d => ({ ...d.data(), id: d.id }))
              sendResponse({ success: true, data: items })
            } catch (err: any) {
              sendResponse({ success: false, error: err.message })
            }
            break
          }

          case 'UNSHARE_BOOKMARK': {
            try {
              const { bookmarkId, teamId } = message.payload as { bookmarkId: string; teamId: string }
              await deleteDoc(doc(db, 'teams', teamId, 'shared', bookmarkId))
              await updateDoc(doc(db, 'teams', teamId), {
                sharedBookmarks: arrayRemove(bookmarkId),
              })
              sendResponse({ success: true })
            } catch (err: any) {
              sendResponse({ success: false, error: err.message })
            }
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
            let note: string
            try {
              note = await suggestNote(snUrl, snTitle, settings.geminiApiKey, pageText)
            } catch (geminiErr) {
              sendResponse({ success: false, error: String(geminiErr) })
              break
            }
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
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
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
                sendResponse({ success: true })
              } else if (res.status === 404) {
                // If model not found, query the API to see what models THIS key actually has access to!
                try {
                  const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
                  const listData = await listRes.json()
                  const available = (listData.models || [])
                    .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
                    .map((m: any) => m.name.replace('models/', ''))
                    
                  if (available.length > 0) {
                    sendResponse({ 
                      success: false, 
                      error: `Model not found. Your key supports these models: ${available.join(', ')}` 
                    })
                  } else {
                    sendResponse({ success: false, error: 'Your API key does not support any text generation models.' })
                  }
                } catch (e) {
                  sendResponse({ success: false, error: 'Model not found, and failed to list available models.' })
                }
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
