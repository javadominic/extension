import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, deleteDoc, getDoc, getDocs, collection, addDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { suggestNoteAndTags } from '../lib/gemini'
import { findRelatedBookmarks } from '../lib/search'
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
import { detectParentBookmark, unlinkBookmark, linkBookmark, getDomainKey } from '../lib/chains'
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

        // Save user profile to Firestore so teammates can see names
        const { uid, displayName, email, photoURL } = result.user
        try {
          await setDoc(doc(db, 'users', uid), { uid, displayName, email, photoURL }, { merge: true })
        } catch {}
        
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

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const activeTab = tabs[0]
    const parentId = await detectParentBookmark(bm.url, activeTab?.openerTabId, undefined, settings.allowCrossSiteChains)
    if (parentId) bm.parentId = parentId
  } catch {}

  // Save the skeleton immediately so the popup can show it instantly
  await upsertBookmark(bm)

  if (settings.geminiApiKey) {
    const pageText = await getActiveTabText()
    try {
      const { note, tags } = await suggestNoteAndTags(bm.url, bm.title, settings.geminiApiKey, pageText)
      bm.note = note
      bm.tags = tags
    } catch {
      // Rate limited or API error — bookmark saved without AI note
    }
    // Update cache with AI notes (or skeleton if AI failed)
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
      const { note, tags } = await suggestNoteAndTags(bm.url, bm.title, apiKey)
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

    } catch (e: any) {
      const msg: string = e?.message ?? ''
      if (msg.startsWith('RATE_LIMIT:')) {
        // Put the bookmark back so it isn't lost
        aiQueue.unshift(bm)
        const retryAfter = parseInt(msg.split(':')[1] ?? '60', 10)
        chrome.runtime.sendMessage({
          type: 'AI_SYNC_RATE_LIMITED',
          payload: { retryAfter, remaining: aiQueue.length },
        }).catch(() => {})
        // Stop the queue — resume after Retry-After seconds
        totalAiQueueSize = 0
        isAiSyncing = false
        setTimeout(() => processAiQueue(), retryAfter * 1000)
        return
      }
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
            // Deduplicate: skip bookmarks already in queue OR already processed (have a note)
            const queuedIds = new Set(aiQueue.map(b => b.id))
            const newBms = bookmarks.filter(b => !b.note && !queuedIds.has(b.id))
            aiQueue.push(...newBms)
            totalAiQueueSize += newBms.length
            processAiQueue()
            sendResponse({ success: true, data: { queued: newBms.length, skipped: bookmarks.length - newBms.length } })
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
              // Persist profile fields so teammates can see names even without Firestore
              const user = auth.currentUser
              if (user) {
                settings.displayName = user.displayName ?? undefined
                settings.email = user.email ?? undefined
                settings.photoURL = user.photoURL ?? undefined
              }
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

          case 'GET_TEAM_MEMBERS': {
            try {
              const { memberIds } = message.payload as { memberIds: string[] }
              const settings = await getSettings()
              const myUid = settings.firebaseUid ?? ''

              // Proactively write the current user's profile so teammates can see their name
              if (myUid && (settings.displayName || settings.email)) {
                try {
                  await setDoc(doc(db, 'users', myUid), {
                    uid: myUid,
                    displayName: settings.displayName ?? null,
                    email: settings.email ?? null,
                    photoURL: settings.photoURL ?? null,
                  }, { merge: true })
                } catch { /* non-critical */ }
              }

              const profiles = await Promise.all(
                memberIds.map(async uid => {
                  try {
                    const snap = await getDoc(doc(db, 'users', uid))
                    if (snap.exists()) return { uid, ...snap.data() }
                  } catch { /* ignore */ }
                  // Fallback: if this UID is the current user, use their settings
                  if (uid === myUid && (settings.displayName || settings.email)) {
                    return {
                      uid,
                      displayName: settings.displayName ?? null,
                      email: settings.email ?? null,
                      photoURL: settings.photoURL ?? null,
                    }
                  }
                  return { uid, displayName: null, email: null, photoURL: null }
                })
              )
              sendResponse({ success: true, data: profiles })
            } catch (err: any) {
              sendResponse({ success: false, error: err.message })
            }
            break
          }


          case 'REMOVE_TEAM_MEMBER': {
            try {
              const { teamId, memberId } = message.payload as { teamId: string; memberId: string }
              await updateDoc(doc(db, 'teams', teamId), { members: arrayRemove(memberId) })
              sendResponse({ success: true })
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
              const settings = await getSettings()
              const uid = settings.firebaseUid ?? ''
              const bm = chromeNodeToBookmark(node, uid)
              bm.note = note

              try {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
                const activeTab = tabs[0]
                const parentId = await detectParentBookmark(bm.url, activeTab?.openerTabId, undefined, settings.allowCrossSiteChains)
                if (parentId) bm.parentId = parentId
              } catch {}
              
              await upsertBookmark(bm)
              if (settings.geminiApiKey) {
                const pageText = await getActiveTabText()
                try {
                  const { tags } = await suggestNoteAndTags(bm.url, bm.title, settings.geminiApiKey, pageText)
                  bm.tags = tags
                } catch { /* ignore */ }
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
            try {
              // One combined call → note + tags together (saves RPD quota)
              const { note, tags } = await suggestNoteAndTags(snUrl, snTitle, settings.geminiApiKey, pageText)
              if (!note) {
                sendResponse({ success: false, error: 'EMPTY' })
                break
              }
              sendResponse({ success: true, data: { note, tags } })
            } catch (geminiErr: any) {
              const msg = String(geminiErr)
              if (msg.includes('RATE_LIMIT')) {
                const match = msg.match(/RATE_LIMIT:(\d+)/)
                const seconds = match?.[1] ?? '60'
                sendResponse({ success: false, error: `RATE_LIMIT:${seconds}` })
              } else {
                sendResponse({ success: false, error: msg })
              }
            }
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

          case 'FIND_RELATED': {
            const { query } = message.payload as { query: string }
            const bookmarks = await getCachedBookmarks()
            const s = await getSettings()
            const threshold = s.searchSuggest?.threshold ?? 2.5
            const results = findRelatedBookmarks(query, bookmarks, threshold)
            sendResponse({ success: true, data: results })
            break
          }

          case 'MUTE_SEARCH_QUERY': {
            const { query: muteQuery } = message.payload as { query: string }
            const s = await getSettings()
            const mutedSearches = s.searchSuggest?.mutedSearches ?? []
            if (!mutedSearches.includes(muteQuery)) mutedSearches.push(muteQuery)
            await saveSettings({ searchSuggest: { ...(s.searchSuggest ?? { enabled: true, engines: { google: true, bing: true, duckduckgo: true, brave: true }, threshold: 2.5, badgeStyle: 'collapsed', mutedSites: [] }), mutedSearches } })
            sendResponse({ success: true })
            break
          }

          case 'MUTE_SEARCH_SITE': {
            const { site } = message.payload as { site: string }
            const s = await getSettings()
            const mutedSites = s.searchSuggest?.mutedSites ?? []
            if (!mutedSites.includes(site)) mutedSites.push(site)
            await saveSettings({ searchSuggest: { ...(s.searchSuggest ?? { enabled: true, engines: { google: true, bing: true, duckduckgo: true, brave: true }, threshold: 2.5, badgeStyle: 'collapsed', mutedSearches: [] }), mutedSites } })
            sendResponse({ success: true })
            break
          }

          case 'RECHECK_BOOKMARKS': {
            const { ids } = message.payload as { ids: string[] }
            const all = await getCachedBookmarks()
            for (const id of ids) {
              const bm = all.find(b => b.id === id)
              if (!bm) continue
              try {
                const status = await checkUrl(bm.url)
                bm.health = status
                bm.lastChecked = Date.now()
                await upsertBookmark(bm)
              } catch {}
            }
            sendResponse({ success: true })
            break
          }

          case 'UNLINK_BOOKMARK': {
            const { id } = message.payload as { id: string }
            const s = await getSettings()
            await unlinkBookmark(id, s.firebaseUid)
            sendResponse({ success: true })
            break
          }

          case 'LINK_BOOKMARK': {
            const { childId, parentId } = message.payload as { childId: string; parentId: string }
            const s = await getSettings()
            await linkBookmark(childId, parentId, s.firebaseUid)
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
