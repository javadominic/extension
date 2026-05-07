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

export interface GraphNode {
  id: string                 // bookmark id
  x: number
  y: number
  radius: number             // scaled by connection count
  clusterId: string
  bookmark: BrainBookmark
}

export interface GraphEdge {
  source: string             // node id
  target: string             // node id
  sharedTags: string[]
}

export interface BookmarkCluster {
  id: string                 // dominant tag name
  label: string              // display label
  color: string              // hex color
  nodeIds: string[]          // bookmark ids in this cluster
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  clusters: BookmarkCluster[]
  width: number
  height: number
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
  teamId?: string      // kept for backward compat
  teamIds?: string[]   // multi-team support
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
  | 'BUILD_GRAPH'
  | 'SUGGEST_NOTE'
  | 'VALIDATE_GEMINI_KEY'
  | 'START_AI_SYNC'
  | 'AI_SYNC_PROGRESS'
  | 'AI_SYNC_RATE_LIMITED'
  | 'MARK_ALIVE'
  | 'CREATE_TEAM'
  | 'JOIN_TEAM'
  | 'SHARE_BOOKMARK'
  | 'GET_TEAM'
  | 'GET_SHARED_BOOKMARKS'
  | 'UNSHARE_BOOKMARK'
  | 'GET_TEAM_MEMBERS'
  | 'REMOVE_TEAM_MEMBER'

export interface ChromeMessage {
  type: MessageType
  payload?: unknown
}

export interface ChromeResponse {
  success: boolean
  data?: unknown
  error?: string
}
