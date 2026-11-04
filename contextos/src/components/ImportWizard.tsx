// 3-step wizard for Pocket / Notion / Readwise import
import { useState } from 'react'
import { importFromPocket, importFromNotion, importFromReadwise } from '../lib/imports'
import { getSettings } from '../lib/storage'
import type { BrainBookmark } from '../types'
import {
  IconArchive,
  IconFileText,
  IconBookOpen,
  IconX,
  IconChevronRight,
  IconCheck,
  type IconProps,
} from './LucideIcons'

type Source = 'pocket' | 'notion' | 'readwise'

interface Props {
  uid: string
  onDone: (bookmarks: BrainBookmark[]) => void
  onClose: () => void
}

const SOURCE_INFO: Record<
  Source,
  {
    label: string
    icon: React.ComponentType<IconProps>
    fields: { key: string; label: string; placeholder: string; type?: string }[]
  }
> = {
  pocket: {
    label: 'Pocket',
    icon: IconArchive,
    fields: [
      { key: 'consumerKey',  label: 'Consumer Key',  placeholder: 'XXXX-XXXX-XXXX-XXXX' },
      { key: 'accessToken',  label: 'Access Token',  placeholder: 'your-access-token' },
    ],
  },
  notion: {
    label: 'Notion',
    icon: IconFileText,
    fields: [
      { key: 'integrationToken', label: 'Integration Token', placeholder: 'secret_...' },
    ],
  },
  readwise: {
    label: 'Readwise',
    icon: IconBookOpen,
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end">
      <div className="w-full bg-surface border-t border-border rounded-t-xl p-4 max-h-[480px] overflow-y-auto">
        {/* Handle */}
        <div className="w-8 h-1 rounded-full bg-border mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-text text-sm">
            {step === 1 && 'Import bookmarks'}
            {step === 2 && `Connect ${source ? SOURCE_INFO[source].label : ''}`}
            {step === 3 && 'Confirm import'}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text p-1 transition-colors rounded"
            aria-label="Close"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                s <= step ? 'bg-amber' : 'bg-surface-raised'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Choose source */}
        {step === 1 && (
          <div className="space-y-2">
            {(Object.keys(SOURCE_INFO) as Source[]).map((src) => {
              const Icon = SOURCE_INFO[src].icon
              return (
                <button
                  key={src}
                  id={`import-${src}`}
                  onClick={() => { setSource(src); setStep(2) }}
                  className="w-full surface-card p-3 flex items-center gap-3 hover:border-border-focus transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-md bg-surface-raised border border-border flex items-center justify-center text-text-secondary flex-shrink-0">
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text text-xs">Import from {SOURCE_INFO[src].label}</p>
                    <p className="text-[11px] text-text-muted">Connect your {SOURCE_INFO[src].label} account</p>
                  </div>
                  <IconChevronRight size={14} className="text-text-muted" />
                </button>
              )
            })}
          </div>
        )}

        {/* Step 2: Enter credentials */}
        {step === 2 && source && (
          <div className="space-y-3">
            {SOURCE_INFO[source].fields.map((field) => (
              <div key={field.key}>
                <label className="block text-[11px] text-text-secondary mb-1 font-medium">{field.label}</label>
                <input
                  id={`import-field-${field.key}`}
                  type={field.type ?? 'text'}
                  className="input-field text-xs"
                  placeholder={field.placeholder}
                  value={fields[field.key] ?? ''}
                  onChange={(e) => setFields((p) => ({ ...p, [field.key]: e.target.value }))}
                />
              </div>
            ))}

            {error && (
              <p className="text-xs text-dead bg-dead/10 border border-dead/20 rounded-md p-2">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setStep(1)} className="btn-ghost flex-1 text-xs">Back</button>
              <button
                id="import-fetch-btn"
                onClick={handleFetch}
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2 text-xs"
              >
                {loading && (
                  <span className="w-3.5 h-3.5 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                )}
                {loading ? 'Fetching…' : 'Fetch and preview'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview & confirm */}
        {step === 3 && (
          <div>
            <div className="surface-card p-3 mb-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-surface-raised border border-border flex items-center justify-center text-text-secondary flex-shrink-0">
                {source && (() => {
                  const Icon = SOURCE_INFO[source].icon
                  return <Icon size={18} />
                })()}
              </div>
              <div>
                <p className="font-semibold text-text text-xs tabular-nums">{preview.length} bookmarks found</p>
                <p className="text-[11px] text-text-muted">Ready to import from {source ? SOURCE_INFO[source].label : ''}</p>
              </div>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4 pr-1">
              {preview.slice(0, 10).map((bm) => (
                <div key={bm.id} className="flex items-center gap-2 text-xs text-text-secondary py-1 border-b border-border">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber flex-shrink-0" />
                  <span className="truncate">{bm.title || bm.url}</span>
                </div>
              ))}
              {preview.length > 10 && (
                <p className="text-[11px] text-text-muted text-center pt-1 tabular-nums">
                  …and {preview.length - 10} more
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="btn-ghost flex-1 text-xs">Back</button>
              <button
                id="import-confirm-btn"
                onClick={handleConfirm}
                className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs"
              >
                <IconCheck size={14} />
                <span>Import all</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
