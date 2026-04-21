// ============================================================
// BrainMark — SettingsPage
// ============================================================
import { useState, useEffect } from 'react'
import ImportWizard from '../../components/ImportWizard'
import Toast        from '../../components/Toast'
import { getSettings, saveSettings } from '../../lib/storage'
import type { AppSettings, BrainBookmark } from '../../types'
import { upsertBookmarkInCache } from '../../lib/storage'

export default function SettingsPage() {
  const [settings,     setSettings]     = useState<AppSettings>({
    geminiApiKey: '',
    toastEnabled: true,
    theme: 'system',
  })
  const [signingIn,    setSigningIn]    = useState(false)
  const [showImport,   setShowImport]   = useState(false)
  const [toast,        setToast]        = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [apiKeyVisible, setApiKeyVisible] = useState(false)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  async function save(patch: Partial<AppSettings>) {
    const updated = { ...settings, ...patch }
    setSettings(updated)
    await saveSettings(updated)
  }

  async function handleGoogleSignIn() {
    setSigningIn(true)
    try {
      const response = await chrome.runtime.sendMessage({ type: 'SIGN_IN' })
      if (response?.success && response.data) {
        await save({ firebaseUid: response.data as string })
        setToast({ msg: 'Signed in with Google!', type: 'success' })
      } else {
        setToast({ msg: 'Sign-in failed. Check your OAuth setup.', type: 'error' })
      }
    } catch {
      setToast({ msg: 'Sign-in error. Ensure identity permission is set.', type: 'error' })
    } finally {
      setSigningIn(false)
    }
  }

  function handleSignOut() {
    save({ firebaseUid: undefined })
    setToast({ msg: 'Signed out.', type: 'info' as 'success' })
  }

  async function handleImportDone(bookmarks: BrainBookmark[]) {
    for (const bm of bookmarks) {
      await upsertBookmarkInCache(bm)
    }
    setToast({ msg: `Imported ${bookmarks.length} bookmarks!`, type: 'success' })
  }

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
            <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold text-white">
              G
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-200">Signed in</p>
              <p className="text-[10px] text-slate-500 font-mono truncate">
                uid: {settings.firebaseUid.slice(0, 16)}…
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors"
            >
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
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-primary-400 hover:text-primary-300 transition-colors"
          >
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
            onChange={(e) => save({ geminiApiKey: e.target.value })}
          />
          <button
            onClick={() => setApiKeyVisible((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-xs"
          >
            {apiKeyVisible ? '🙈' : '👁️'}
          </button>
        </div>
        {settings.geminiApiKey && (
          <p className="text-[10px] text-emerald-400">✓ Key saved — AI features enabled</p>
        )}
      </section>

      {/* Preferences */}
      <section className="glass-card p-3 space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preferences</p>

        {/* Toast toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-200 font-medium">Toast notifications</p>
            <p className="text-[10px] text-slate-500">"You saved this because…" overlays</p>
          </div>
          <button
            id="toast-toggle"
            onClick={() => save({ toastEnabled: !settings.toastEnabled })}
            className={`w-10 h-5 rounded-full transition-all duration-200 relative flex-shrink-0 ${
              settings.toastEnabled ? 'bg-primary-600' : 'bg-surface-border'
            }`}
          >
            <span
              className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all duration-200 ${
                settings.toastEnabled ? 'left-5' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* Theme selector */}
        <div>
          <p className="text-sm text-slate-200 font-medium mb-1.5">Theme</p>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as const).map((t) => (
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

      {/* Import */}
      <section className="glass-card p-3 space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Import Bookmarks</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Pocket',   icon: '🗃️' },
            { label: 'Notion',   icon: '📄' },
            { label: 'Readwise', icon: '📚' },
          ].map((src) => (
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

      {/* Version */}
      <p className="text-center text-[10px] text-slate-700 pb-1">
        BrainMark v1.0.0 · Built with Gemini AI
      </p>

      {showImport && (
        <ImportWizard
          uid={settings.firebaseUid ?? ''}
          onDone={handleImportDone}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}
