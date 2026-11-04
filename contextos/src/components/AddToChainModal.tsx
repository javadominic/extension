import { useState } from 'react'
import type { BrainBookmark } from '../types'
import type { SiteGroup } from '../lib/chains'
import { getSettings } from '../lib/storage'
import { linkBookmark } from '../lib/chains'
import { IconLink2, IconX } from './LucideIcons'

interface Props {
  group: SiteGroup
  allBookmarks: BrainBookmark[]
  onClose: () => void
  onSuccess: (msg: string) => void
}

export default function AddToChainModal({
  group,
  allBookmarks,
  onClose,
  onSuccess,
}: Props) {
  const [tab, setTab] = useState<'existing' | 'new'>('existing')
  const [selectedBmId, setSelectedBmId] = useState<string>('')
  const [newUrl, setNewUrl] = useState<string>('')
  const [newTitle, setNewTitle] = useState<string>('')
  const [parentTargetId, setParentTargetId] = useState<string>(group.nodes[0]?.bookmark.id ?? '')
  const [saving, setSaving] = useState(false)

  const candidates = allBookmarks.filter(b => !group.bookmarks.some(gb => gb.id === b.id))

  async function handleLinkExisting(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBmId) return
    setSaving(true)
    try {
      const s = await getSettings()
      await linkBookmark(selectedBmId, parentTargetId || group.nodes[0]?.bookmark.id, s.firebaseUid)
      onSuccess('Bookmark linked to chain')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleAddNew(e: React.FormEvent) {
    e.preventDefault()
    if (!newUrl.trim()) return
    setSaving(true)
    try {
      const s = await getSettings()
      chrome.runtime.sendMessage({
        type: 'SAVE_NEW_PAGE_WITH_NOTE',
        payload: {
          title: newTitle.trim() || newUrl.trim(),
          url: newUrl.trim(),
          note: '',
        },
      }, () => {
        setTimeout(async () => {
          onSuccess('Page saved and linked to chain')
          onClose()
        }, 500)
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="surface-card w-full max-w-sm p-4 space-y-3.5 border border-border shadow-xl">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div className="flex items-center gap-2">
            <IconLink2 size={15} className="text-amber" strokeWidth={1.5} />
            <span className="font-medium text-text text-sm">Add to chain: {group.domainKey}</span>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text p-1 cursor-pointer"
            aria-label="Close"
          >
            <IconX size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex gap-1 p-0.5 rounded-btn bg-surface-raised border border-border">
          <button
            type="button"
            onClick={() => setTab('existing')}
            className={`flex-1 text-xs py-1 rounded font-medium transition-colors duration-fast cursor-pointer ${
              tab === 'existing'
                ? 'bg-amber text-[#1A1405] font-semibold'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            Link existing save
          </button>
          <button
            type="button"
            onClick={() => setTab('new')}
            className={`flex-1 text-xs py-1 rounded font-medium transition-colors duration-fast cursor-pointer ${
              tab === 'new'
                ? 'bg-amber text-[#1A1405] font-semibold'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            Add new URL
          </button>
        </div>

        {/* Parent selector */}
        <div>
          <label className="text-xs text-text-muted block mb-1">Parent page in chain</label>
          <select
            value={parentTargetId}
            onChange={e => setParentTargetId(e.target.value)}
            className="w-full text-xs bg-surface border border-border text-text rounded-btn p-2 focus:border-amber focus:outline-none cursor-pointer"
          >
            {group.nodes.map(n => (
              <option key={n.bookmark.id} value={n.bookmark.id}>
                {n.isRoot ? '[Root] ' : '  ↳ '}{n.bookmark.title.slice(0, 40)}
              </option>
            ))}
          </select>
        </div>

        {tab === 'existing' ? (
          <form onSubmit={handleLinkExisting} className="space-y-3">
            <div>
              <label className="text-xs text-text-muted block mb-1">Select save to link</label>
              {candidates.length === 0 ? (
                <p className="text-xs text-text-muted italic py-1">No other bookmarks available to link.</p>
              ) : (
                <select
                  value={selectedBmId}
                  onChange={e => setSelectedBmId(e.target.value)}
                  className="w-full text-xs bg-surface border border-border text-text rounded-btn p-2 focus:border-amber focus:outline-none cursor-pointer"
                  required
                >
                  <option value="">Choose a save…</option>
                  {candidates.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.title.slice(0, 45)} ({b.domainKey || b.url.slice(0, 25)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost text-xs py-1.5 px-3 min-h-[32px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !selectedBmId}
                className="btn-primary text-xs py-1.5 px-3.5 min-h-[32px]"
              >
                {saving ? 'Linking…' : 'Link to chain'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAddNew} className="space-y-3">
            <div>
              <label className="text-xs text-text-muted block mb-1">Page URL</label>
              <input
                type="url"
                placeholder="https://example.com/page"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                className="input-field text-xs py-1.5"
                required
              />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">Title (optional)</label>
              <input
                type="text"
                placeholder="Page title"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="input-field text-xs py-1.5"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost text-xs py-1.5 px-3 min-h-[32px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !newUrl.trim()}
                className="btn-primary text-xs py-1.5 px-3.5 min-h-[32px]"
              >
                {saving ? 'Adding…' : 'Add and link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
