import { useState, useEffect } from 'react'
import {
  IconCheck,
  IconX,
  IconChevronRight,
  IconChevronLeft,
  IconSearch,
  IconBookmark,
  IconLock,
  IconEye,
  IconEyeOff,
  IconSliders,
  IconExternalLink,
  IconHash,
  IconBrain,
  IconNetwork,
} from '../components/LucideIcons'
import { getSettings, saveSettings, setCompletedTour } from '../lib/storage'
import type { AppSettings } from '../types'
import contextosLogo from '/icons/icon128.png'

const TOTAL_STEPS = 7

export default function OnboardingApp({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState<number>(1)
  const [settings, setSettings] = useState<AppSettings>({
    geminiApiKey: '',
    toastEnabled: true,
    theme: 'dark',
  })

  // Google sign in state
  const [signingIn, setSigningIn] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // API key state
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [keyStatus, setKeyStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
  const [keyError, setKeyError] = useState('')

  // Sensitivity demo state
  const [demoSensitivity, setDemoSensitivity] = useState<'strict' | 'balanced' | 'broad'>('balanced')

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s)
      if (s.geminiApiKey) setApiKeyInput(s.geminiApiKey)
    })

    // Keyboard listener for navigation & escape to quit
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleExit()
      } else if (e.key === 'ArrowRight' && (e.metaKey || e.ctrlKey)) {
        handleNext()
      } else if (e.key === 'ArrowLeft' && (e.metaKey || e.ctrlKey)) {
        handleBack()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [step])

  async function handleExit() {
    await setCompletedTour(true)
    if (onComplete) {
      onComplete()
    } else {
      window.close()
    }
  }

  function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1)
    } else {
      handleExit()
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep((s) => s - 1)
    }
  }

  async function handleGoogleSignIn() {
    setSigningIn(true)
    setAuthError(null)
    try {
      const response = await chrome.runtime.sendMessage({ type: 'SIGN_IN' })
      if (response?.success && response.data) {
        const uid = response.data as string
        const updated = { ...settings, firebaseUid: uid }
        setSettings(updated)
        await saveSettings(updated)
      } else {
        setAuthError(response?.error || 'Sign in failed. Check your network or OAuth client setup.')
      }
    } catch (e: any) {
      setAuthError(e?.message || 'Unexpected sign-in error.')
    } finally {
      setSigningIn(false)
    }
  }

  async function handleSaveAndTestKey() {
    const trimmed = apiKeyInput.trim()
    if (!trimmed) {
      setKeyStatus('invalid')
      setKeyError('Please enter an API key.')
      return
    }

    setKeyStatus('checking')
    setKeyError('')

    try {
      const res = await chrome.runtime.sendMessage({
        type: 'VALIDATE_GEMINI_KEY',
        payload: { key: trimmed },
      })

      if (res?.success) {
        setKeyStatus('valid')
        const updated = { ...settings, geminiApiKey: trimmed }
        setSettings(updated)
        await saveSettings(updated)
      } else {
        setKeyStatus('invalid')
        setKeyError(res?.error || 'Invalid API key or network error.')
      }
    } catch (err: any) {
      setKeyStatus('invalid')
      setKeyError(err?.message || 'Could not validate key.')
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-bg text-text overflow-hidden">
      {/* ── Top Header Navigation Bar ──────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-border bg-surface">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-surface-raised border border-border flex items-center justify-center p-1 shadow-sm">
            <img src={contextosLogo} alt="Contextos" className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-serif italic text-sm text-amber tracking-tight">Contextos</span>
            <span className="text-border text-text-muted">/</span>
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Guide</span>
          </div>
        </div>

        {/* Step Indicator & Exit */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
            <span className="text-amber tabular-nums font-semibold">{step}</span>
            <span>of</span>
            <span className="tabular-nums">{TOTAL_STEPS}</span>
          </div>

          <div className="h-3 w-px bg-border" />

          <button
            onClick={handleExit}
            className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text px-2 py-1 rounded hover:bg-surface-raised transition-colors"
            title="Exit guide (Esc)"
          >
            <IconX size={12} />
            <span className="font-mono">Exit</span>
          </button>
        </div>
      </header>

      {/* Progress Track Line */}
      <div className="flex-shrink-0 w-full bg-surface-raised h-0.5">
        <div
          className="bg-amber h-full transition-all duration-300 ease-out"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {/* ── Scrollable Step Content ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* STEP 1: Welcome & Philosophy */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <span className="text-xs font-mono text-amber uppercase tracking-wider">Step 1 — Welcome</span>
              <h1 className="text-xl font-serif text-text tracking-tight">
                Never forget <span className="italic text-amber">why</span> you saved a page.
              </h1>
              <p className="text-sm text-text-secondary leading-relaxed">
                Traditional bookmarks become digital graveyards of dead links and forgotten intentions.
                Contextos is designed as an active thought archive: you record your reason, tags, and memory
                right alongside the link.
              </p>
            </div>

            {/* Split Comparison Cards */}
            <div className="grid gap-3">
              {/* Bad: Traditional Bookmark */}
              <div className="surface-card p-3.5 border border-border/80 opacity-60 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs text-text-muted font-mono">
                  <span>TRADITIONAL BOOKMARK</span>
                  <span className="text-dead">✕ Forgotten</span>
                </div>
                <div className="p-3 bg-surface-raised/40 rounded-lg border border-border/40 text-xs text-text-muted truncate font-mono">
                  https://github.com/org/repo-name...
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Saved 8 months ago. You have no idea what was important about it or which project it belonged to.
                </p>
              </div>

              {/* Good: Contextos Save */}
              <div className="surface-card p-3.5 border-2 border-amber/40 bg-surface rounded-xl space-y-3 shadow-lg shadow-amber/5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-amber font-semibold">CONTEXTOS SAVE</span>
                  <span className="text-live flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-live" />
                    Alive
                  </span>
                </div>
                <div className="p-3 bg-surface-raised rounded-lg border border-border text-xs text-text font-medium">
                  Authentication architecture with PKCE
                </div>
                <div className="p-2.5 bg-amber-soft/40 border border-amber/20 rounded-md text-xs text-text-secondary leading-relaxed font-sans">
                  <span className="font-semibold text-amber-text block mb-0.5">Your reason:</span>
                  "Reference for our OAuth token refresh migration. See section 4 on silent re-authentication."
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="chip-neutral text-[10px] font-mono">#auth</span>
                  <span className="chip-neutral text-[10px] font-mono">#security</span>
                  <span className="chip-neutral text-[10px] font-mono">#migration</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Google Sign-in */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <span className="text-xs font-mono text-amber uppercase tracking-wider">Step 2 — Account & Sync</span>
              <h1 className="text-xl font-serif text-text tracking-tight">
                Connect your account for <span className="italic text-amber">cloud backup</span>.
              </h1>
              <p className="text-sm text-text-secondary leading-relaxed">
                Signing in enables seamless multi-device sync and lets you share collections with your team.
                Prefer to stay off-grid? You can use Contextos entirely in local offline mode anytime.
              </p>
            </div>

            <div className="surface-card p-3.5 rounded-lg border border-border space-y-5">
              {settings.firebaseUid ? (
                <div className="p-4 rounded-lg bg-live/10 border border-live/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-live/20 text-live flex items-center justify-center">
                      <IconCheck size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text">Account connected</p>
                      <p className="text-[11px] font-mono text-text-muted">UID: {settings.firebaseUid.substring(0, 12)}…</p>
                    </div>
                  </div>
                  <span className="text-xs text-live font-mono">Synced</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={signingIn}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-surface-raised border border-border hover:border-amber text-text hover:text-amber text-xs font-medium flex items-center justify-center gap-2.5 transition-all shadow-sm"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>{signingIn ? 'Connecting…' : 'Sign in with Google'}</span>
                  </button>

                  {authError && (
                    <p className="text-xs text-dead bg-dead/10 border border-dead/20 rounded-md p-3">
                      {authError}
                    </p>
                  )}
                </div>
              )}

              <div className="border-t border-border pt-4 flex items-center justify-between text-xs text-text-muted">
                <span>Want to stay local? You can skip this step anytime.</span>
                <button
                  onClick={handleNext}
                  className="text-text-secondary hover:text-amber underline underline-offset-4"
                >
                  Continue without account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Gemini API Key & Connection Test */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <span className="text-xs font-mono text-amber uppercase tracking-wider">Step 3 — AI Engine</span>
              <h1 className="text-xl font-serif text-text tracking-tight">
                Activate <span className="italic text-amber">semantic memory</span> with Gemini.
              </h1>
              <p className="text-sm text-text-secondary leading-relaxed">
                Contextos uses Google Gemini to generate smart notes, extract hashtags, and create vector embeddings.
                Your key stays completely private in local Chrome storage.
              </p>
            </div>

            <div className="surface-card p-3.5 rounded-lg border border-border space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-text-secondary font-medium">Gemini API Key</label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                  >
                    <span>Get a free key at Google AI Studio</span>
                    <IconExternalLink size={12} />
                  </a>
                </div>

                <div className="relative flex items-center">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => {
                      setApiKeyInput(e.target.value)
                      setKeyStatus('idle')
                      setKeyError('')
                    }}
                    placeholder="AIzaSy..."
                    className="input-field pr-20 text-xs font-mono"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="p-1 text-text-muted hover:text-text"
                      title={showKey ? 'Hide key' : 'Show key'}
                    >
                      {showKey ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Status & Feedback */}
              {keyStatus === 'valid' && (
                <div className="p-3 bg-live/10 border border-live/20 rounded-md text-xs text-live flex items-center gap-2">
                  <IconCheck size={14} />
                  <span>Connection verified: Gemini 1.5 Flash is ready.</span>
                </div>
              )}

              {keyStatus === 'invalid' && (
                <div className="p-3 bg-dead/10 border border-dead/20 rounded-md text-xs text-dead">
                  {keyError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveAndTestKey}
                  disabled={keyStatus === 'checking' || !apiKeyInput.trim()}
                  className="btn-primary text-xs flex items-center gap-2"
                >
                  {keyStatus === 'checking' ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                      <span>Verifying…</span>
                    </>
                  ) : (
                    <span>Test and save key</span>
                  )}
                </button>

                <span className="text-[11px] text-text-muted">
                  You can also configure or update this anytime in Settings.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: How to Save Pages & Site Chains */}
        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <span className="text-xs font-mono text-amber uppercase tracking-wider">Step 4 — Capturing Context</span>
              <h1 className="text-xl font-serif text-text tracking-tight">
                Capture pages with <span className="italic text-amber">intent</span>.
              </h1>
              <p className="text-sm text-text-secondary leading-relaxed">
                Saving is active, not passive. Whenever you bookmark something, add a quick remark explaining why it matters.
              </p>
            </div>

            <div className="grid gap-3">
              {/* Feature 1 */}
              <div className="surface-card p-4 rounded-xl border border-border space-y-2">
                <div className="w-8 h-8 rounded-lg bg-surface-raised border border-border flex items-center justify-center text-amber">
                  <IconBookmark size={16} />
                </div>
                <h2 className="text-xs font-semibold text-text">The "+ Save" Button</h2>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Open the Contextos popup while on any page and click "+ Save". It auto-reads the title and invites your personal thought.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="surface-card p-4 rounded-xl border border-border space-y-2">
                <div className="w-8 h-8 rounded-lg bg-surface-raised border border-border flex items-center justify-center text-amber">
                  <span className="font-mono text-xs font-bold">⌥S</span>
                </div>
                <h2 className="text-xs font-semibold text-text">Instant Keyboard Shortcut</h2>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-surface-raised border border-border text-[10px] font-mono">Alt+S</kbd> (or <kbd className="px-1.5 py-0.5 rounded bg-surface-raised border border-border text-[10px] font-mono">Option+S</kbd> on Mac) to save without touching the mouse.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="surface-card p-4 rounded-xl border border-border space-y-2">
                <div className="w-8 h-8 rounded-lg bg-surface-raised border border-border flex items-center justify-center text-amber">
                  <IconNetwork size={16} />
                </div>
                <h2 className="text-xs font-semibold text-text">Site Chains</h2>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Saving multiple articles from the same documentation or research domain automatically links them as a chain journey.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Hashtags & Quick Filtering */}
        {step === 5 && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <span className="text-xs font-mono text-amber uppercase tracking-wider">Step 5 — Organization</span>
              <h1 className="text-xl font-serif text-text tracking-tight">
                Organize inline with <span className="italic text-amber">#hashtags</span>.
              </h1>
              <p className="text-sm text-text-secondary leading-relaxed">
                Forget rigid, nested folders. Simply include `#hashtags` inside your remarks to automatically categorize and filter your library.
              </p>
            </div>

            <div className="surface-card p-3.5 rounded-lg border border-border space-y-5">
              <div className="space-y-2">
                <span className="text-xs text-text-muted font-mono">EXAMPLE REMARK</span>
                <div className="p-4 bg-surface-raised rounded-lg border border-border font-sans text-xs leading-relaxed text-text">
                  "Check out this clean card hover interaction and typography scale for our{' '}
                  <span className="text-amber font-mono font-medium">#frontend</span> redesign on the{' '}
                  <span className="text-amber font-mono font-medium">#dashboard</span>."
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-text-muted font-mono">AUTOMATIC FILTER CHIPS</span>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="chip-selected flex items-center gap-1 text-xs">
                    <IconHash size={12} />
                    <span>#frontend</span>
                    <span className="text-[10px] opacity-70">14</span>
                  </span>
                  <span className="chip-neutral flex items-center gap-1 text-xs">
                    <IconHash size={12} />
                    <span>#dashboard</span>
                    <span className="text-[10px] opacity-70">8</span>
                  </span>
                  <span className="chip-neutral flex items-center gap-1 text-xs">
                    <IconHash size={12} />
                    <span>#security</span>
                    <span className="text-[10px] opacity-70">5</span>
                  </span>
                  <span className="chip-neutral flex items-center gap-1 text-xs">
                    <IconHash size={12} />
                    <span>#docs</span>
                    <span className="text-[10px] opacity-70">19</span>
                  </span>
                </div>
                <p className="text-[11px] text-text-muted pt-2 leading-relaxed">
                  Click any hashtag chip in the Saves tab to narrow down your library in milliseconds.
                  Don't want to type tags manually? Gemini automatically extracts topic tags for you.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Search Matrices & Sensitivity */}
        {step === 6 && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <span className="text-xs font-mono text-amber uppercase tracking-wider">Step 6 — Retrieval Engine</span>
              <h1 className="text-xl font-serif text-text tracking-tight">
                Search matrices & <span className="italic text-amber">sensitivity tuning</span>.
              </h1>
              <p className="text-sm text-text-secondary leading-relaxed">
                Contextos ranks matches using three combined signals: your personal remark words, keyword coverage gating, and semantic embedding vectors.
              </p>
            </div>

            <div className="surface-card p-3.5 rounded-lg border border-border space-y-6">
              {/* Three Pillars */}
              <div className="grid gap-3 text-xs">
                <div className="p-3 bg-surface-raised rounded-lg border border-border space-y-1">
                  <span className="text-amber font-mono font-semibold block text-[11px]">1. YOUR REMARK</span>
                  <p className="text-text-secondary text-[11px] leading-relaxed">
                    Personal notes get highest weight. Searching what you actually thought brings it straight to top.
                  </p>
                </div>

                <div className="p-3 bg-surface-raised rounded-lg border border-border space-y-1">
                  <span className="text-amber font-mono font-semibold block text-[11px]">2. KEYWORD GATE</span>
                  <p className="text-text-secondary text-[11px] leading-relaxed">
                    Enforces minimum word coverage so random substring overlaps won't pollute your results.
                  </p>
                </div>

                <div className="p-3 bg-surface-raised rounded-lg border border-border space-y-1">
                  <span className="text-amber font-mono font-semibold block text-[11px]">3. SEMANTIC VECTOR</span>
                  <p className="text-text-secondary text-[11px] leading-relaxed">
                    Finds concept relationships even when you use different synonyms than the page author.
                  </p>
                </div>
              </div>

              {/* Sensitivity Selector */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-text font-medium flex items-center gap-1.5">
                    <IconSliders size={14} className="text-amber" />
                    <span>Search Sensitivity</span>
                  </label>
                  <span className="font-mono text-xs text-amber font-semibold uppercase">{demoSensitivity}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDemoSensitivity('strict')}
                    className={`p-2.5 rounded-lg border text-xs text-center transition-all ${
                      demoSensitivity === 'strict'
                        ? 'border-amber bg-amber/10 text-amber font-semibold'
                        : 'border-border bg-surface-raised text-text-secondary hover:text-text'
                    }`}
                  >
                    Strict
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoSensitivity('balanced')}
                    className={`p-2.5 rounded-lg border text-xs text-center transition-all ${
                      demoSensitivity === 'balanced'
                        ? 'border-amber bg-amber/10 text-amber font-semibold'
                        : 'border-border bg-surface-raised text-text-secondary hover:text-text'
                    }`}
                  >
                    Balanced
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoSensitivity('broad')}
                    className={`p-2.5 rounded-lg border text-xs text-center transition-all ${
                      demoSensitivity === 'broad'
                        ? 'border-amber bg-amber/10 text-amber font-semibold'
                        : 'border-border bg-surface-raised text-text-secondary hover:text-text'
                    }`}
                  >
                    Broad
                  </button>
                </div>

                <p className="text-[11px] text-text-muted leading-relaxed">
                  {demoSensitivity === 'strict' &&
                    'Strict requires strong exact phrase and keyword matches. Perfect when looking for a specific link.'}
                  {demoSensitivity === 'balanced' &&
                    'Balanced (Recommended) blends personal remarks, title match, and tag relevance for day-to-day search.'}
                  {demoSensitivity === 'broad' &&
                    'Broad casts a wider net across topic concepts when you only recall vague ideas.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: In-Browser Helpers & Pinning */}
        {step === 7 && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <span className="text-xs font-mono text-amber uppercase tracking-wider">Step 7 — Daily Browsing</span>
              <h1 className="text-xl font-serif text-text tracking-tight">
                Context follows you <span className="italic text-amber">wherever you browse</span>.
              </h1>
              <p className="text-sm text-text-secondary leading-relaxed">
                Contextos works quietly inside your browser to surface your past saves at the exact moment you need them.
              </p>
            </div>

            <div className="grid gap-3">
              {/* Helper 1 */}
              <div className="surface-card p-3.5 rounded-lg border border-border space-y-3">
                <span className="text-xs font-mono text-amber font-semibold">1. THE CORNER PILL</span>
                <p className="text-xs text-text-secondary leading-relaxed">
                  When browsing any page, a subtle draggable pill appears in the corner. If you've saved the page before, it displays your previous notes so you never redo work.
                </p>
                <div className="p-3 bg-surface-raised rounded-lg border border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber" />
                    <span className="font-medium text-text">Contextos</span>
                  </div>
                  <span className="text-text-muted text-[11px]">Saved 3 wks ago</span>
                </div>
              </div>

              {/* Helper 2 */}
              <div className="surface-card p-3.5 rounded-lg border border-border space-y-3">
                <span className="text-xs font-mono text-amber font-semibold">2. GOOGLE SEARCH ASSIST</span>
                <p className="text-xs text-text-secondary leading-relaxed">
                  When you search on Google, Bing, Brave, or DuckDuckGo, Contextos checks your private archive and displays your past saves right next to web results.
                </p>
                <div className="p-3 bg-surface-raised rounded-lg border border-border flex items-center justify-between text-xs">
                  <span className="text-text font-medium">Related saves</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber/15 text-amber">
                    2 saves found
                  </span>
                </div>
              </div>
            </div>

            {/* Pinning Tip Banner */}
            <div className="p-4 bg-amber-soft/40 border border-amber/30 rounded-xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-surface border border-amber/40 flex items-center justify-center text-amber flex-shrink-0">
                <IconBookmark size={20} />
              </div>
              <div className="text-xs text-text-secondary leading-relaxed">
                <p className="font-semibold text-text mb-0.5">Tip: Pin Contextos to your toolbar</p>
                <span>
                  Click Chrome's puzzle piece icon (<span className="text-text font-medium">Extensions</span>) in the top right of your browser, then click the pin icon next to Contextos for 1-click access.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Footer Controls ────────────────────────────────────── */}
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between flex-shrink-0">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className={`flex items-center gap-1 text-xs font-mono px-2.5 py-1.5 rounded transition-colors ${
              step === 1 ? 'opacity-30 cursor-not-allowed text-text-muted' : 'text-text hover:bg-surface-raised'
            }`}
          >
            <IconChevronLeft size={13} />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExit}
              className="text-xs text-text-muted hover:text-text px-2.5 py-1.5 font-mono transition-colors"
            >
              Skip guide
            </button>

            <button
              onClick={handleNext}
              className="btn-primary text-xs flex items-center gap-1 px-3 py-1.5"
            >
              <span>{step === TOTAL_STEPS ? 'Start using Contextos' : 'Continue'}</span>
              <IconChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
