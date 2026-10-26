import { useState } from 'react'
import type { BrainBookmark } from '../types'
import type { SiteGroup } from '../lib/chains'
import { getSettings } from '../lib/storage'
import { linkBookmark } from '../lib/chains'

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

  // Potential candidates from other bookmarks not already in this chain
  const candidates = allBookmarks.filter(b => !group.bookmarks.some(gb => gb.id === b.id))

  async function handleLinkExisting(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBmId) return
    setSaving(true)
    try {
      const s = await getSettings()
      await linkBookmark(selectedBmId, parentTargetId || group.nodes[0]?.bookmark.id, s.firebaseUid)
      onSuccess('Bookmark linked to chain!')
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
        // Link to parentTarget
        setTimeout(async () => {
          onSuccess('Page added and linked to chain!')
          onClose()
        }, 500)
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
      <div className="glass-card w-full max-w-sm p-4 space-y-3.5 bg-[#141414] border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base">🔗</span>
            <span className="font-semibold text-slate-100 text-sm">Add to chain: {group.domainKey}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-base leading-none p-1"
          >
            ×
          </button>
        </div>

        {/* Tab switch: Link existing vs Add new URL */}
        <div className="flex gap-1.5 p-0.5 rounded-lg bg-surface-border/50">
          <button
            type="button"
            onClick={() => setTab('existing')}
            className={`flex-1 text-xs py-1 rounded-md font-medium transition-all ${
              tab === 'existing'
                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Link existing save
          </button>
          <button
            type="button"
            onClick={() => setTab('new')}
            className={`flex-1 text-xs py-1 rounded-md font-medium transition-all ${
              tab === 'new'
                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Add new URL
          </button>
        </div>

        {/* Parent selector */}
        <div>
          <label className="text-[11px] font-semibold text-slate-400 block mb-1">Parent page:</label>
          <select
            value={parentTargetId}
            onChange={e => setParentTargetId(e.target.value)}
            className="w-full text-xs bg-surface-card border border-surface-border text-slate-200 rounded-lg p-2 focus:border-primary-500 focus:outline-none"
          >
            {group.nodes.map(n => (
              <option key={n.bookmark.id} value={n.bookmark.id}>
                {n.isRoot ? '★ ' : '↳ '}{n.bookmark.title.slice(0, 40)}
              </option>
            ))}
          </select>
        </div>

        {tab === 'existing' ? (
          <form onSubmit={handleLinkExisting} className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Select bookmark to attach:</label>
              {candidates.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-2">No other bookmarks available to link.</p>
              ) : (
                <select
                  value={selectedBmId}
                  onChange={e => setSelectedBmId(e.target.value)}
                  className="w-full text-xs bg-surface-card border border-surface-border text-slate-200 rounded-lg p-2 focus:border-primary-500 focus:outline-none"
                  required
                >
                  <option value="">-- Choose a bookmark --</option>
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
                className="px-3 py-1.5 rounded-lg border border-surface-border text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !selectedBmId}
                className="btn-primary text-xs px-3.5 py-1.5"
              >
                {saving ? 'Linking…' : 'Link to Chain'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAddNew} className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Page URL:</label>
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
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Title (optional):</label>
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
                className="px-3 py-1.5 rounded-lg border border-surface-border text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !newUrl.trim()}
                className="btn-primary text-xs px-3.5 py-1.5"
              >
                {saving ? 'Adding…' : 'Add & Link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
