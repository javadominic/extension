import { useState, useEffect } from 'react'
import ImportWizard from '../../components/ImportWizard'
import Toast        from '../../components/Toast'
import { getSettings, saveSettings } from '../../lib/storage'
import type { AppSettings, BrainBookmark, SearchSuggestSettings } from '../../types'
import { upsertBookmark } from '../../lib/storage'
import {
  IconLock,
  IconEye,
  IconEyeOff,
  IconSun,
  IconMoon,
  IconMonitor,
  IconChevronDown,
  IconChevronRight,
  IconCopy,
  IconCheck,
} from '../../components/LucideIcons'

const DEFAULT_SUGGEST: SearchSuggestSettings = {
  enabled: true,
  engines: { google: true, bing: true, duckduckgo: true, brave: true, opera: true },
  threshold: 2.5,
  badgeStyle: 'collapsed',
  mutedSearches: [],
  mutedSites: [],
}

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id?: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-colors duration-normal relative flex-shrink-0 cursor-pointer ${
        checked ? 'bg-amber' : 'bg-surface-raised border border-border-control'
      }`}
    >
      <span
        className={`w-3.5 h-3.5 rounded-full absolute top-[2px] transition-transform duration-normal ${
          checked ? 'left-[22px] bg-[#1A1405]' : 'left-[2px] bg-text-secondary'
        }`}
      />
    </button>
  )
}

export default function SettingsPage() {
  const [settings,     setSettings]     = useState<AppSettings>({ geminiApiKey: '', toastEnabled: true, theme: 'system' })
  const [signingIn,    setSigningIn]    = useState(false)
  const [showImport,   setShowImport]   = useState(false)
  const [toast,        setToast]        = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [keyStatus,    setKeyStatus]    = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
  const [keyError,     setKeyError]     = useState('')
  const [copiedUid,    setCopiedUid]    = useState(false)
  const [showAdvancedEngines, setShowAdvancedEngines] = useState(false)

  useEffect(() => { getSettings().then(setSettings) }, [])

  const suggest = settings.searchSuggest ?? DEFAULT_SUGGEST

  function applyTheme(theme: string) {
    const root = document.documentElement
    if (theme === 'light')      root.setAttribute('data-theme', 'light')
    else if (theme === 'dark')  root.setAttribute('data-theme', 'dark')
    else root.setAttribute('data-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  }

  async function save(patch: Partial<AppSettings>) {
    const updated = { ...settings, ...patch }
    setSettings(updated)
    await saveSettings(updated)
    if (patch.theme) applyTheme(patch.theme)
    if ('geminiApiKey' in patch) { setKeyStatus('idle'); setKeyError('') }
  }

  async function saveSuggest(patch: Partial<SearchSuggestSettings>) {
    const updated: SearchSuggestSettings = { ...suggest, ...patch }
    await save({ searchSuggest: updated })
  }

  async function validateKey() {
    if (!settings.geminiApiKey?.trim()) return
    setKeyStatus('checking')
    setKeyError('')
    try {
      const res = await chrome.runtime.sendMessage({ type: 'VALIDATE_GEMINI_KEY', payload: { key: settings.geminiApiKey.trim() } })
      if (res?.success) setKeyStatus('valid')
      else { setKeyStatus('invalid'); setKeyError(res?.error ?? 'Unknown error.') }
    } catch (e) {
      setKeyStatus('invalid'); setKeyError(`Could not reach background: ${(e as Error).message}`)
    }
  }

  async function handleGoogleSignIn() {
    setSigningIn(true)
    try {
      const response = await chrome.runtime.sendMessage({ type: 'SIGN_IN' })
      if (response?.success && response.data) {
        await save({ firebaseUid: response.data as string })
        setToast({ msg: 'Signed in with Google!', type: 'success' })
      } else {
        setToast({ msg: response?.error || 'Sign-in failed. Check your OAuth setup.', type: 'error' })
      }
    } catch (e: any) {
      setToast({ msg: `Sign-in error: ${e?.message || 'Unknown error'}`, type: 'error' })
    } finally { setSigningIn(false) }
  }

  function handleSignOut() {
    save({ firebaseUid: undefined })
    setToast({ msg: 'Signed out.', type: 'success' })
  }

  function handleCopyUid() {
    if (!settings.firebaseUid) return
    navigator.clipboard.writeText(settings.firebaseUid)
    setCopiedUid(true)
    setTimeout(() => setCopiedUid(false), 1500)
  }

  async function handleImportDone(bookmarks: BrainBookmark[]) {
    for (const bm of bookmarks) await upsertBookmark(bm)
    setToast({ msg: `Imported ${bookmarks.length} bookmarks!`, type: 'success' })
  }

  async function unmuteSearch(q: string) {
    await saveSuggest({ mutedSearches: suggest.mutedSearches.filter(m => m !== q) })
  }

  async function unmuteSite(site: string) {
    await saveSuggest({ mutedSites: suggest.mutedSites.filter(m => m !== site) })
  }

  // Slider mapping: Left = Fewer matches (higher threshold), Right = More matches (lower threshold)
  // Let internal threshold be: slider value 1 (fewer) to 5 (more)
  // Slider position: 1 => threshold 4.0 (fewer), 3 => threshold 2.5 (balanced), 5 => threshold 1.0 (more)
  const sliderValue = Math.max(1, Math.min(5, 5 - (suggest.threshold - 1)))
  const thresholdLabel = suggest.threshold <= 1.8
    ? 'More matches'
    : suggest.threshold <= 3.2
    ? 'Balanced'
    : 'Fewer matches'

  function handleSliderChange(val: number) {
    // Inverse: higher slider val = more matches (lower threshold)
    const newThreshold = Math.max(1, Math.min(5, 5 - (val - 1)))
    saveSuggest({ threshold: newThreshold })
  }

  const mutedCount = (suggest.mutedSearches?.length || 0) + (suggest.mutedSites?.length || 0)

  return (
    <div className="flex flex-col h-full overflow-y-auto px-3 py-3 space-y-3 select-none">
      {toast && (
        <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />
      )}

      {/* ── 1. Account ──────────────────────────────────────────────── */}
      <section className="surface-card p-3.5 space-y-2.5">
        <h2 className="text-sm font-medium text-text">Account</h2>
        {settings.firebaseUid ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-surface-raised border border-border-control flex items-center justify-center text-xs font-semibold text-text">
              G
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text">Signed in</p>
              <div className="flex items-center gap-1.5 text-xs text-text-secondary font-mono">
                <span className="truncate">uid: {settings.firebaseUid.slice(0, 14)}…</span>
                <button
                  type="button"
                  onClick={handleCopyUid}
                  className="p-1 hover:text-text cursor-pointer"
                  title="Copy full UID"
                  aria-label="Copy full UID"
                >
                  {copiedUid ? <IconCheck size={14} className="text-live" /> : <IconCopy size={14} />}
                </button>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="text-xs text-danger hover:underline cursor-pointer font-medium"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            id="google-signin-btn"
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-2 btn-secondary min-h-[36px]"
          >
            {signingIn ? (
              <span className="w-4 h-4 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span>{signingIn ? 'Signing in…' : 'Sign in with Google'}</span>
          </button>
        )}
      </section>

      {/* ── 2. Search Suggestions (Simplified, 1 Master Switch) ───────── */}
      <section className="surface-card p-3.5 space-y-3">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => saveSuggest({ enabled: !suggest.enabled })}
        >
          <div>
            <h2 className="text-sm font-medium text-text">Show related saves when I search</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Works automatically on Google, Bing, DuckDuckGo, Brave, and Opera.
            </p>
          </div>
          <Toggle
            id="suggest-master-toggle"
            checked={suggest.enabled}
            onChange={v => saveSuggest({ enabled: v })}
          />
        </div>

        {suggest.enabled && (
          <div className="space-y-3 pt-1 border-t border-border">
            {/* Sensitivity Slider: Fewer matches on Left, More matches on Right */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-text">Sensitivity</span>
                <span className="text-amber-text font-medium">{thresholdLabel}</span>
              </div>
              <input
                id="suggest-threshold"
                type="range"
                min="1"
                max="5"
                step="0.5"
                value={sliderValue}
                onChange={e => handleSliderChange(parseFloat(e.target.value))}
                className="w-full accent-amber cursor-pointer"
                aria-label="Search suggestions sensitivity"
              />
              <div className="flex justify-between text-[11px] text-text-muted">
                <span>Fewer matches</span>
                <span>More matches</span>
              </div>
            </div>

            {/* Auto-open toggle */}
            <div
              className="flex items-center justify-between cursor-pointer py-1"
              onClick={() => saveSuggest({ badgeStyle: suggest.badgeStyle === 'auto-expand' ? 'collapsed' : 'auto-expand' })}
            >
              <div>
                <p className="text-xs font-medium text-text">Open the card when a match is strong</p>
                <p className="text-[11px] text-text-secondary">Automatically expand panel for high-confidence results</p>
              </div>
              <Toggle
                id="suggest-auto-expand-toggle"
                checked={suggest.badgeStyle === 'auto-expand'}
                onChange={v => saveSuggest({ badgeStyle: v ? 'auto-expand' : 'collapsed' })}
              />
            </div>

            {/* Muted searches and sites */}
            {mutedCount > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-border">
                <p className="text-xs font-medium text-text">Muted searches and sites ({mutedCount})</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggest.mutedSearches?.map(q => (
                    <button
                      key={q}
                      onClick={() => unmuteSearch(q)}
                      className="chip-neutral text-[11px] cursor-pointer hover:border-danger hover:text-danger"
                      title="Click to unmute this search query"
                    >
                      <span>"{q}"</span>
                      <span className="text-text-muted">×</span>
                    </button>
                  ))}
                  {suggest.mutedSites?.map(s => (
                    <button
                      key={s}
                      onClick={() => unmuteSite(s)}
                      className="chip-neutral text-[11px] cursor-pointer hover:border-danger hover:text-danger"
                      title="Click to unmute this site"
                    >
                      <span>{s}</span>
                      <span className="text-text-muted">×</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Privacy note */}
            <div className="flex items-center gap-2 pt-1 text-xs text-text-secondary">
              <IconLock size={14} className="text-amber flex-shrink-0" />
              <span>Matching happens on your device. Your searches never leave it.</span>
            </div>

            {/* Optional Advanced row for per-engine toggles */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvancedEngines(prev => !prev)}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-text cursor-pointer font-medium"
              >
                {showAdvancedEngines ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                <span>Advanced engine settings</span>
              </button>
              {showAdvancedEngines && (
                <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-border">
                  {(Object.keys(suggest.engines) as Array<keyof typeof suggest.engines>).map(eng => (
                    <div key={eng} className="flex items-center justify-between surface-raised-card px-2.5 py-1.5 text-xs">
                      <span className="capitalize text-text">
                        {eng === 'duckduckgo' ? 'DuckDuckGo' : eng === 'brave' ? 'Brave' : eng === 'opera' ? 'Opera / GX' : eng.charAt(0).toUpperCase() + eng.slice(1)}
                      </span>
                      <Toggle
                        id={`suggest-engine-${eng}`}
                        checked={!!suggest.engines[eng]}
                        onChange={v => saveSuggest({ engines: { ...suggest.engines, [eng]: v } })}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── 3. Preferences ─────────────────────────────────────────── */}
      <section className="surface-card p-3.5 space-y-3">
        <h2 className="text-sm font-medium text-text">Preferences</h2>

        {/* Toast Notifications */}
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => save({ toastEnabled: !settings.toastEnabled })}
        >
          <div>
            <p className="text-xs font-medium text-text">Toast notifications</p>
            <p className="text-[11px] text-text-secondary">"You saved this because…" overlays on save</p>
          </div>
          <Toggle
            id="toast-toggle"
            checked={!!settings.toastEnabled}
            onChange={v => save({ toastEnabled: v })}
          />
        </div>

        {/* Cross-site chains */}
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => save({ allowCrossSiteChains: !settings.allowCrossSiteChains })}
        >
          <div>
            <p className="text-xs font-medium text-text">Cross-site chains</p>
            <p className="text-[11px] text-text-secondary">Allow linking chains across different domains</p>
          </div>
          <Toggle
            id="cross-site-chains-toggle"
            checked={!!settings.allowCrossSiteChains}
            onChange={v => save({ allowCrossSiteChains: v })}
          />
        </div>

        {/* Theme Segment Control */}
        <div>
          <p className="text-xs font-medium text-text mb-1.5">Theme</p>
          <div className="flex gap-1.5 p-1 rounded-btn bg-surface-raised border border-border">
            {[
              { id: 'light',  label: 'Light',  Icon: IconSun },
              { id: 'dark',   label: 'Dark',   Icon: IconMoon },
              { id: 'system', label: 'System', Icon: IconMonitor },
            ].map(t => {
              const active = (settings.theme ?? 'system') === t.id
              const TabIcon = t.Icon
              return (
                <button
                  key={t.id}
                  id={`theme-${t.id}`}
                  type="button"
                  onClick={() => save({ theme: t.id as AppSettings['theme'] })}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-btn font-medium transition-all duration-normal cursor-pointer ${
                    active
                      ? 'bg-amber text-[#1A1405] font-semibold'
                      : 'text-text-secondary hover:text-text'
                  }`}
                >
                  <TabIcon size={14} strokeWidth={1.5} />
                  <span>{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── 4. AI Key (Gemini) ──────────────────────────────────────── */}
      <section className="surface-card p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-text">API key</h2>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-amber-text hover:underline"
          >
            Get free key ↗
          </a>
        </div>
        <div className="relative">
          <input
            id="gemini-key-input"
            type={apiKeyVisible ? 'text' : 'password'}
            className="input-field pr-10 text-xs font-mono"
            placeholder="AIzaSy…"
            value={settings.geminiApiKey || ''}
            onChange={e => save({ geminiApiKey: e.target.value })}
          />
          <button
            type="button"
            onClick={() => setApiKeyVisible(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text cursor-pointer p-1"
            aria-label={apiKeyVisible ? 'Hide key' : 'Show key'}
          >
            {apiKeyVisible ? <IconEyeOff size={16} /> : <IconEye size={16} />}
          </button>
        </div>

        {settings.geminiApiKey && (
          <div className="flex items-center gap-2 pt-0.5">
            <button
              id="test-gemini-key-btn"
              type="button"
              onClick={validateKey}
              disabled={keyStatus === 'checking'}
              className="btn-secondary text-xs py-1 px-2.5 min-h-[30px]"
            >
              {keyStatus === 'checking' ? (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 border border-text-secondary border-t-transparent rounded-full animate-spin" />
                  Testing…
                </span>
              ) : 'Test key'}
            </button>
            {keyStatus === 'valid'   && <span className="text-xs text-live font-medium">✓ Key works: AI ready</span>}
            {keyStatus === 'invalid' && <span className="text-xs text-dead font-medium">✗ Key failed. Check it and try again.</span>}
            {keyStatus === 'idle'    && <span className="text-xs text-text-muted">Key saved: click test to verify</span>}
          </div>
        )}
        {keyStatus === 'invalid' && keyError && (
          <p className="text-xs text-dead leading-snug">{keyError}</p>
        )}
      </section>

      {/* ── 5. Import Bookmarks ─────────────────────────────────────── */}
      <section className="surface-card p-3.5 space-y-2.5">
        <h2 className="text-sm font-medium text-text">Import bookmarks</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Pocket' },
            { label: 'Notion' },
            { label: 'Readwise' },
          ].map(src => (
            <button
              key={src.label}
              id={`open-import-${src.label.toLowerCase()}`}
              onClick={() => setShowImport(true)}
              className="btn-secondary flex flex-col items-center justify-center py-2 min-h-[44px] cursor-pointer"
            >
              <span className="text-xs font-medium text-text">{src.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── 6. Tour Guide ───────────────────────────────────────────── */}
      <section className="surface-card p-3.5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-text">Tour guide</h2>
          <p className="text-xs text-text-muted">Replay the interactive onboarding walkthrough</p>
        </div>
        <button
          type="button"
          onClick={() => {
            chrome.tabs.create({ url: chrome.runtime.getURL('src/onboarding/index.html') })
          }}
          className="btn-secondary text-xs py-1.5 px-3 min-h-[32px] cursor-pointer"
        >
          Replay guide
        </button>
      </section>

      <p className="text-center text-xs text-text-muted pb-1">
        Contextos v1.1.0
      </p>

      {showImport && (
        <ImportWizard uid={settings.firebaseUid ?? ''} onDone={handleImportDone} onClose={() => setShowImport(false)} />
      )}
    </div>
  )
}
