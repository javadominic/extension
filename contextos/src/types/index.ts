export interface BrainBookmark {
  id: string
  url: string
  title: string
  note: string               // why they saved it
  tags: string[]             // AI-generated tags
  addedAt: number            // unix timestamp
  health: 'alive' | 'dead' | 'unchecked'
  lastChecked?: number
  source: 'chrome' | 'pocket' | 'notion' | 'readwise'
  sharedWith?: string[]      // team member uids
  uid: string
}

export interface TeamData {
  id: string
  name: string
  members: string[]          // uids
  sharedBookmarks: string[]  // bookmark ids
}

export interface AppSettings {
  geminiApiKey: string
  toastEnabled: boolean
  theme: 'light' | 'dark' | 'system'
  teamId?: string
  firebaseUid?: string
}

export type MessageType =
  | 'GET_BOOKMARKS'
  | 'SAVE_NOTE'
  | 'APPEND_NOTE'
  | 'CHECK_HEALTH'
  | 'GET_SETTINGS'
  | 'GET_PAGE_TEXT'
  | 'ADD_BOOKMARK'
  | 'DELETE_BOOKMARK'
  | 'SYNC_BOOKMARKS'
  | 'SHOW_TOAST'
  | 'SIGN_IN'
  | 'OPEN_POPUP'
  | 'SAVE_NEW_PAGE_WITH_NOTE'

export interface ChromeMessage {
  type: MessageType
  payload?: unknown
}

export interface ChromeResponse {
  success: boolean
  data?: unknown
  error?: string
}
