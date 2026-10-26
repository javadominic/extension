import { useState, useEffect } from 'react'
import ImportWizard from '../../components/ImportWizard'
import Toast        from '../../components/Toast'
import { getSettings, saveSettings } from '../../lib/storage'
import type { AppSettings, BrainBookmark, SearchSuggestSettings } from '../../types'
import { upsertBookmark } from '../../lib/storage'

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
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-all duration-200 relative flex-shrink-0 ${checked ? 'bg-primary-600' : 'bg-surface-border'}`}
    >
      <span className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all duration-200 ${checked ? 'left-5' : 'left-0.5'}`} />
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
    if (!settings.geminiApiKey.trim()) return
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
    setToast({ msg: 'Signed out.', type: 'info' as 'success' })
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

  const thresholdLabel = suggest.threshold <= 1.5
    ? 'More matches'
    : suggest.threshold <= 3
    ? 'Balanced'
    : 'Fewer matches'

  return (
    <div className="flex flex-col h-full overflow-y-auto px-3 py-3 space-y-4">
      {toast && (
        <Toast message={toast.msg} type={toast.type as 'success' | 'error'} onDismiss={() => setToast(null)} />
      )}

      {/* Google Auth */}
      <section className="glass-card p-3 space-y-2.5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account</p>
        {settings.firebaseUid ? (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold text-white">G</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-200">Signed in</p>
              <p className="text-[10px] text-slate-500 font-mono truncate">uid: {settings.firebaseUid.slice(0, 16)}…</p>
            </div>
            <button onClick={handleSignOut} className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors">
              Sign out
            </button>
          </div>
        ) : (
          <button
            id="google-signin-btn"
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-2.5 bg-white text-gray-800 font-semibold text-sm py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {signingIn ? (
              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {signingIn ? 'Signing in…' : 'Sign in with Google'}
          </button>
        )}
      </section>

      {/* Gemini API Key */}
      <section className="glass-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gemini API Key</p>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
            className="text-[10px] text-primary-400 hover:text-primary-300 transition-colors">
            Get free key ↗
          </a>
        </div>
        <div className="relative">
          <input
            id="gemini-key-input"
            type={apiKeyVisible ? 'text' : 'password'}
            className="input-field pr-10"
            placeholder="AIza…"
            value={settings.geminiApiKey}
            onChange={e => save({ geminiApiKey: e.target.value })}
          />
          <button
            onClick={() => setApiKeyVisible(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-xs"
          >
            {apiKeyVisible ? '🙈' : '👁️'}
          </button>
        </div>
        {settings.geminiApiKey && (
          <div className="flex items-center gap-2">
            <button
              id="test-gemini-key-btn"
              onClick={validateKey}
              disabled={keyStatus === 'checking'}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-surface-border text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all disabled:opacity-50"
            >
              {keyStatus === 'checking' ? (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Testing…
                </span>
              ) : '🔌 Test Key'}
            </button>
            {keyStatus === 'valid'   && <span className="text-[10px] text-emerald-400 font-medium">✓ Key is valid — AI ready</span>}
            {keyStatus === 'invalid' && <span className="text-[10px] text-red-400 font-medium">✗ Invalid key</span>}
            {keyStatus === 'idle'    && <span className="text-[10px] text-slate-600">Key saved — tap to verify</span>}
          </div>
        )}
        {keyStatus === 'invalid' && keyError && (
          <p className="text-[10px] text-red-400/80 leading-snug">{keyError}</p>
        )}
      </section>

      {/* Preferences */}
      <section className="glass-card p-3 space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preferences</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-200 font-medium">Toast notifications</p>
            <p className="text-[10px] text-slate-500">"You saved this because…" overlays</p>
          </div>
          <Toggle id="toast-toggle" checked={!!settings.toastEnabled} onChange={v => save({ toastEnabled: v })} />
        </div>
        <div>
          <p className="text-sm text-slate-200 font-medium mb-1.5">Theme</p>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as const).map(t => (
              <button
                key={t}
                id={`theme-${t}`}
                onClick={() => save({ theme: t })}
                className={`flex-1 text-xs py-1.5 rounded-lg border font-medium capitalize transition-all duration-150 ${
                  settings.theme === t
                    ? 'bg-primary-500/20 border-primary-500/50 text-primary-300'
                    : 'border-surface-border text-slate-500 hover:border-slate-600 hover:text-slate-400'
                }`}
              >
                {t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '🖥️'} {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Search Suggestions */}
      <section className="glass-card p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search suggestions</p>
          <Toggle id="suggest-master-toggle" checked={suggest.enabled} onChange={v => saveSuggest({ enabled: v })} />
        </div>

        {suggest.enabled && (
          <>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 mb-1.5">Engines</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(suggest.engines) as Array<keyof typeof suggest.engines>).map(eng => (
                  <div key={eng} className="flex items-center justify-between glass-card px-2.5 py-1.5">
                    <span className="text-xs text-slate-300 capitalize">{eng === 'duckduckgo' ? 'DuckDuckGo' : eng === 'brave' ? 'Brave' : eng === 'opera' ? 'Opera / GX' : eng.charAt(0).toUpperCase() + eng.slice(1)}</span>
                    <Toggle
                      id={`suggest-engine-${eng}`}
                      checked={!!suggest.engines[eng]}
                      onChange={v => saveSuggest({ engines: { ...suggest.engines, [eng]: v } })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold text-slate-400">Sensitivity</p>
                <span className="text-[10px] text-primary-400 font-medium">{thresholdLabel}</span>
              </div>
              <input
                id="suggest-threshold"
                type="range"
                min="1"
                max="5"
                step="0.5"
                value={suggest.threshold}
                onChange={e => saveSuggest({ threshold: parseFloat(e.target.value) })}
                className="w-full accent-amber-400"
              />
              <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                <span>More matches</span>
                <span>Fewer matches</span>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-400 mb-1.5">Badge style</p>
              <div className="flex gap-2">
                {(['collapsed', 'auto-expand'] as const).map(style => (
                  <button
                    key={style}
                    id={`suggest-badge-${style}`}
                    onClick={() => saveSuggest({ badgeStyle: style })}
                    className={`flex-1 text-[11px] py-1.5 rounded-lg border font-medium transition-all duration-150 ${
                      suggest.badgeStyle === style
                        ? 'bg-primary-500/20 border-primary-500/50 text-primary-300'
                        : 'border-surface-border text-slate-500 hover:border-slate-600 hover:text-slate-400'
                    }`}
                  >
                    {style === 'collapsed' ? '🔵 Collapsed' : '⚡ Auto-expand'}
                  </button>
                ))}
              </div>
            </div>

            {(suggest.mutedSearches.length > 0 || suggest.mutedSites.length > 0) && (
              <div className="space-y-2">
                {suggest.mutedSearches.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 mb-1">Muted searches</p>
                    <div className="flex flex-wrap gap-1">
                      {suggest.mutedSearches.map(q => (
                        <button
                          key={q}
                          onClick={() => unmuteSearch(q)}
                          className="text-[10px] bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 rounded-full px-2 py-0.5 transition-all"
                          title="Click to unmute"
                        >
                          "{q}" ×
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {suggest.mutedSites.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 mb-1">Muted sites</p>
                    <div className="flex flex-wrap gap-1">
                      {suggest.mutedSites.map(site => (
                        <button
                          key={site}
                          onClick={() => unmuteSite(site)}
                          className="text-[10px] bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 rounded-full px-2 py-0.5 transition-all"
                          title="Click to unmute"
                        >
                          {site} ×
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-primary-500/5 border border-primary-500/15 rounded-lg px-3 py-2">
              <p className="text-[10px] text-slate-500 leading-relaxed">
                🔒 <strong className="text-slate-400">Privacy:</strong> Matching happens on your device. Your searches are never sent anywhere.
              </p>
            </div>
          </>
        )}
      </section>

      {/* Import */}
      <section className="glass-card p-3 space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Import Bookmarks</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Pocket',   icon: '🗃️' },
            { label: 'Notion',   icon: '📄' },
            { label: 'Readwise', icon: '📚' },
          ].map(src => (
            <button
              key={src.label}
              id={`open-import-${src.label.toLowerCase()}`}
              onClick={() => setShowImport(true)}
              className="glass-card p-2 flex flex-col items-center gap-1 hover:border-primary-500/40 hover:bg-primary-500/5 transition-all duration-150"
            >
              <span className="text-xl">{src.icon}</span>
              <span className="text-[10px] text-slate-400 font-medium">{src.label}</span>
            </button>
          ))}
        </div>
      </section>

      <p className="text-center text-[10px] text-slate-700 pb-1">
        Contextos v1.0.0 · Made with ❤️ for people
      </p>

      {showImport && (
        <ImportWizard uid={settings.firebaseUid ?? ''} onDone={handleImportDone} onClose={() => setShowImport(false)} />
      )}
    </div>
  )
}
