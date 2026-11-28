export interface CitationMetadata {
  authors: string[]
  publishedDate?: string
  siteName?: string
  journal?: string
  doi?: string
  arxivId?: string
  volume?: string
  issue?: string
  pages?: string
}

export interface BrainBookmark {
  id: string
  url: string
  title: string
  note: string
  tags: string[]
  addedAt: number
  health: 'alive' | 'dead' | 'unchecked'
  lastChecked?: number
  source: 'chrome' | 'pocket' | 'notion' | 'readwise'
  sharedWith?: string[]
  uid: string
  embedding?: number[]
  localEmbedding?: number[]
  parentId?: string | null
  domainKey?: string
  citationMeta?: CitationMetadata
  quote?: string
}

export interface GraphNode {
  id: string
  x: number
  y: number
  radius: number
  clusterId: string
  bookmark: BrainBookmark
}

export interface GraphEdge {
  source: string
  target: string
  sharedTags?: string[]
  type?: 'tag' | 'chain'
}

export interface BookmarkCluster {
  id: string
  label: string
  color: string
  nodeIds: string[]
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
  members: string[]
  sharedBookmarks: string[]
  createdBy?: string
}

export interface SearchSuggestSettings {
  enabled: boolean
  engines: {
    google: boolean
    bing: boolean
    duckduckgo: boolean
    brave: boolean
    opera?: boolean
  }
  threshold: number
  badgeStyle: 'collapsed' | 'auto-expand'
  mutedSearches: string[]
  mutedSites: string[]
}

export interface AppSettings {
  geminiApiKey: string
  geminiModel?: string
  toastEnabled: boolean
  theme: 'light' | 'dark' | 'system'
  teamId?: string
  teamIds?: string[]
  firebaseUid?: string
  displayName?: string
  email?: string
  photoURL?: string
  lastSeenSharedCount?: Record<string, number>
  searchSuggest?: SearchSuggestSettings
  allowCrossSiteChains?: boolean
  localModelEnabled?: boolean
  localModelDownloaded?: boolean
}

export interface MatchResult {
  bookmark: BrainBookmark
  score: number
  matchReason: string
  chainLength?: number
}

export type MessageType =
  | 'GET_BOOKMARKS'
  | 'SAVE_NOTE'
  | 'APPEND_NOTE'
  | 'CHECK_HEALTH'
  | 'GET_SETTINGS'
  | 'GET_PAGE_TEXT'
  | 'GET_PAGE_DATA'
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
  | 'FIND_RELATED'
  | 'MUTE_SEARCH_QUERY'
  | 'MUTE_SEARCH_SITE'
  | 'RECHECK_BOOKMARKS'
  | 'UNLINK_BOOKMARK'
  | 'LINK_BOOKMARK'
  | 'LOCAL_AI_DOWNLOAD'
  | 'LOCAL_AI_STATUS'
  | 'LOCAL_AI_EMBED'
  | 'LOCAL_AI_REINDEX'
  | 'LOCAL_AI_PROGRESS'
  | 'LOCAL_AI_CLEAR'

export interface ChromeMessage {
  type: MessageType
  payload?: unknown
}

export interface ChromeResponse {
  success: boolean
  data?: unknown
  error?: string
}
