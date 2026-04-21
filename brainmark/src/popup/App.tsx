// ============================================================
// Contextos — App.tsx (Tab Router)
// ============================================================
import { useState, useEffect } from 'react'
import SearchPage    from './pages/SearchPage'
import BookmarksPage from './pages/BookmarksPage'
import TeamsPage     from './pages/TeamsPage'
import SettingsPage  from './pages/SettingsPage'
import { getSettings } from '../lib/storage'

type Tab = 'search' | 'bookmarks' | 'teams' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'search',    label: 'Search',    icon: '🔍' },
  { id: 'bookmarks', label: 'Saves',     icon: '🔖' },
  { id: 'teams',     label: 'Teams',     icon: '👥' },
  { id: 'settings',  label: 'Settings',  icon: '⚙️'  },
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
        // system: follow OS preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
      }
    }

    getSettings().then((s) => applyTheme(s.theme ?? 'system'))

    // Listen for system preference changes when on 'system' mode
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      getSettings().then((s) => { if (s.theme === 'system') applyTheme('system') })
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-2.5 px-4 py-3 border-b border-surface-border bg-surface-card">
        <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center text-base">
          🧠
        </div>
        <span className="font-bold text-slate-100 tracking-tight">Contextos</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow" />
          <span className="text-xs text-slate-500">AI ready</span>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'search'    && <SearchPage />}
        {activeTab === 'bookmarks' && <BookmarksPage />}
        {activeTab === 'teams'     && <TeamsPage />}
        {activeTab === 'settings'  && <SettingsPage />}
      </main>

      {/* Bottom tab bar */}
      <nav className="flex border-t border-surface-border bg-surface-card">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <span className="w-4 h-0.5 rounded-full bg-primary-500 mt-0.5" />
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}
