// ============================================================
// Contextos — ImportWizard Component
// 3-step wizard for Pocket / Notion / Readwise import
// ============================================================
import { useState } from 'react'
import { importFromPocket, importFromNotion, importFromReadwise } from '../lib/imports'
import { getSettings } from '../lib/storage'
import type { BrainBookmark } from '../types'

type Source = 'pocket' | 'notion' | 'readwise'

interface Props {
  uid: string
  onDone: (bookmarks: BrainBookmark[]) => void
  onClose: () => void
}

const SOURCE_INFO: Record<Source, { label: string; icon: string; fields: { key: string; label: string; placeholder: string; type?: string }[] }> = {
  pocket: {
    label: 'Pocket',
    icon: '🗃️',
    fields: [
      { key: 'consumerKey',  label: 'Consumer Key',  placeholder: 'XXXX-XXXX-XXXX-XXXX' },
      { key: 'accessToken',  label: 'Access Token',  placeholder: 'your-access-token' },
    ],
  },
  notion: {
    label: 'Notion',
    icon: '📄',
    fields: [
      { key: 'integrationToken', label: 'Integration Token', placeholder: 'secret_...' },
    ],
  },
  readwise: {
    label: 'Readwise',
    icon: '📚',
    fields: [
      { key: 'token', label: 'API Token', placeholder: 'your-readwise-token' },
    ],
  },
}

export default function ImportWizard({ uid, onDone, onClose }: Props) {
  const [step,       setStep]       = useState<1 | 2 | 3>(1)
  const [source,     setSource]     = useState<Source | null>(null)
  const [fields,     setFields]     = useState<Record<string, string>>({})
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [preview,    setPreview]    = useState<BrainBookmark[]>([])

  async function handleFetch() {
    if (!source) return
    setLoading(true)
    setError(null)
    try {
      const settings = await getSettings()
      const gemKey = settings.geminiApiKey ?? ''
      let result: BrainBookmark[] = []

      if (source === 'pocket') {
        result = await importFromPocket(fields.consumerKey, fields.accessToken, uid, gemKey)
      } else if (source === 'notion') {
        result = await importFromNotion(fields.integrationToken, uid, gemKey)
      } else if (source === 'readwise') {
        result = await importFromReadwise(fields.token, uid, gemKey)
      }

      setPreview(result)
      setStep(3)
    } catch (err) {
      setError((err as Error).message ?? 'Import failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  function handleConfirm() {
    onDone(preview)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end animate-fade-in">
      <div className="w-full bg-surface-card border-t border-surface-border rounded-t-2xl p-4 animate-slide-up max-h-[480px] overflow-y-auto">
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-surface-border mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-100 text-base">
            {step === 1 && 'Import Bookmarks'}
            {step === 2 && `Connect ${source ? SOURCE_INFO[source].label : ''}`}
            {step === 3 && 'Confirm Import'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl transition-colors">×</button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-primary-500' : 'bg-surface-border'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Choose source */}
        {step === 1 && (
          <div className="space-y-2">
            {(Object.keys(SOURCE_INFO) as Source[]).map((src) => (
              <button
                key={src}
                id={`import-${src}`}
                onClick={() => { setSource(src); setStep(2) }}
                className="w-full glass-card p-3 flex items-center gap-3 hover:border-primary-500/50 hover:bg-primary-500/5 transition-all duration-150 text-left"
              >
                <span className="text-2xl">{SOURCE_INFO[src].icon}</span>
                <div>
                  <p className="font-semibold text-slate-100 text-sm">Import from {SOURCE_INFO[src].label}</p>
                  <p className="text-xs text-slate-500">Connect your {SOURCE_INFO[src].label} account</p>
                </div>
                <span className="ml-auto text-slate-600">›</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Enter credentials */}
        {step === 2 && source && (
          <div className="space-y-3">
            {SOURCE_INFO[source].fields.map((field) => (
              <div key={field.key}>
                <label className="block text-xs text-slate-500 mb-1.5 font-medium">{field.label}</label>
                <input
                  id={`import-field-${field.key}`}
                  type={field.type ?? 'text'}
                  className="input-field"
                  placeholder={field.placeholder}
                  value={fields[field.key] ?? ''}
                  onChange={(e) => setFields((p) => ({ ...p, [field.key]: e.target.value }))}
                />
              </div>
            ))}

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setStep(1)} className="btn-ghost flex-1">Back</button>
              <button
                id="import-fetch-btn"
                onClick={handleFetch}
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading && (
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                {loading ? 'Fetching…' : 'Fetch & Preview'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview & confirm */}
        {step === 3 && (
          <div>
            <div className="glass-card p-3 mb-4 flex items-center gap-3">
              <span className="text-3xl">
                {source ? SOURCE_INFO[source].icon : '📦'}
              </span>
              <div>
                <p className="font-bold text-slate-100">{preview.length} bookmarks found</p>
                <p className="text-xs text-slate-500">Ready to import from {source ? SOURCE_INFO[source].label : ''}</p>
              </div>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4 pr-1">
              {preview.slice(0, 10).map((bm) => (
                <div key={bm.id} className="flex items-center gap-2 text-xs text-slate-400 py-1 border-b border-surface-border">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                  <span className="truncate">{bm.title || bm.url}</span>
                </div>
              ))}
              {preview.length > 10 && (
                <p className="text-xs text-slate-500 text-center pt-1">
                  …and {preview.length - 10} more
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="btn-ghost flex-1">Back</button>
              <button
                id="import-confirm-btn"
                onClick={handleConfirm}
                className="btn-primary flex-1"
              >
                ✓ Import All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
