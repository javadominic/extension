import { useState, useEffect } from 'react'
import SearchPage    from './pages/SearchPage'
import BookmarksPage from './pages/BookmarksPage'
import GraphPage     from './pages/GraphPage'
import TeamsPage     from './pages/TeamsPage'
import SettingsPage  from './pages/SettingsPage'
import { getSettings } from '../lib/storage'
import type { TeamData } from '../types'
import {
  IconBrain,
  IconSearch,
  IconBookmark,
  IconNetwork,
  IconUsers,
  IconSettings,
} from '../components/LucideIcons'

import graphIcon from '../assets/icons/tab-graph.png'
import teamsIcon from '../assets/icons/tab-teams.png'
import settingsIcon from '../assets/icons/tab-settings.png'

type Tab = 'search' | 'bookmarks' | 'graph' | 'teams' | 'settings'

interface TabItem {
  id: Tab
  label: string
  Icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  image?: string
}

const TABS: TabItem[] = [
  { id: 'search',    label: 'Search',   Icon: IconSearch },
  { id: 'bookmarks', label: 'Saves',    Icon: IconBookmark },
  { id: 'graph',     label: 'Graph',    image: graphIcon },
  { id: 'teams',     label: 'Teams',    image: teamsIcon },
  { id: 'settings',  label: 'Settings', image: settingsIcon },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('bookmarks')

  // Apply theme on mount and whenever settings change
  useEffect(() => {
    function applyTheme(theme: string) {
      const root = document.documentElement
      if (theme === 'light') {
        root.setAttribute('data-theme', 'light')
      } else if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark')
      } else {
        root.setAttribute('data-theme', 'system')
      }
    }

    getSettings().then((s) => applyTheme(s.theme ?? 'system'))

    const tabHandler = (e: any) => {
      if (e.detail?.tab) setActiveTab(e.detail.tab)
    }
    window.addEventListener('SWITCH_TAB', tabHandler)

    // Listen for storage theme changes in real time
    function onStorageChange(changes: Record<string, chrome.storage.StorageChange>, area: string) {
      if (area === 'local' && changes.settings?.newValue?.theme) {
        applyTheme(changes.settings.newValue.theme)
      }
    }
    chrome.storage.onChanged.addListener(onStorageChange)
    return () => {
      window.removeEventListener('SWITCH_TAB', tabHandler)
      chrome.storage.onChanged.removeListener(onStorageChange)
    }
  }, [])

  const [totalNewShared, setTotalNewShared] = useState(0)

  // Fetch shared bookmarks count
  useEffect(() => {
    async function loadCounts() {
      const s = await getSettings()
      const ids = s.teamIds ?? (s.teamId ? [s.teamId] : [])
      if (ids.length > 0) {
        let newCount = 0
        for (const id of ids) {
          try {
            const res = await chrome.runtime.sendMessage({ type: 'GET_TEAM', payload: { teamId: id } })
            if (res?.success && res.data) {
              const team = res.data as TeamData
              const totalShared = team.sharedBookmarks.length
              const lastSeen = s.lastSeenSharedCount?.[id] || 0
              if (totalShared > lastSeen) {
                newCount += (totalShared - lastSeen)
              }
            }
          } catch {}
        }
        setTotalNewShared(newCount)
      }
    }
    loadCounts()
  }, [])

  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-bg text-text">
      {/* ── Header (Sticky, Lucide Brain on Amber Tile, Wordmark, AI Ready) ── */}
      <header className="sticky top-0 z-40 flex items-center gap-2.5 px-4 py-2.5 border-b border-border bg-surface select-none">
        <div
          className="w-7 h-7 rounded-lg bg-amber flex items-center justify-center flex-shrink-0"
          aria-hidden="true"
        >
          <IconBrain size={18} strokeWidth={1.5} className="text-[#1A1405]" />
        </div>
        <span className="font-display italic text-xl text-text tracking-tight">Contextos</span>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-text-secondary font-medium">
          <span className="w-2 h-2 rounded-full bg-live" aria-hidden="true" />
          <span>AI ready</span>
        </div>
      </header>

      {/* ── Page Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'search'    && <SearchPage />}
        {activeTab === 'bookmarks' && <BookmarksPage />}
        {activeTab === 'graph'     && <GraphPage />}
        {activeTab === 'teams'     && <TeamsPage />}
        {activeTab === 'settings'  && <SettingsPage />}
      </main>

      {/* ── Bottom Nav (Five Lucide Icons, 2px Amber Top Bar when Active) ── */}
      <nav
        className="flex border-t border-border bg-surface min-h-[48px] select-none"
        role="tablist"
        aria-label="Navigation tabs"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const TabIcon = tab.Icon
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              className={`relative flex-1 flex flex-col items-center justify-center py-1.5 gap-1 text-xs font-medium cursor-pointer transition-colors duration-normal min-h-[48px] ${
                isActive
                  ? 'text-amber-text'
                  : 'text-text-secondary hover:text-text'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {/* Active 2px amber top bar */}
              {isActive && (
                <div
                  className="absolute top-0 left-0 right-0 h-[2px] bg-amber"
                  aria-hidden="true"
                />
              )}

              <div className="relative flex items-center justify-center w-5 h-5">
                {tab.image ? (
                  <img
                    src={tab.image}
                    alt={tab.label}
                    className={`w-5 h-5 object-contain transition-all duration-150 ${
                      isActive ? 'scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                  />
                ) : TabIcon ? (
                  <TabIcon
                    size={20}
                    strokeWidth={1.5}
                    className={isActive ? 'text-amber' : 'currentColor'}
                  />
                ) : null}
                {tab.id === 'teams' && totalNewShared > 0 && (
                  <span className="absolute -top-1 -right-2 bg-dead text-white text-[10px] font-medium px-1 rounded-full min-w-[15px] text-center leading-tight">
                    {totalNewShared > 9 ? '9+' : totalNewShared}
                  </span>
                )}
              </div>
              <span className="leading-none text-[11px]">{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
