// ============================================================
// Contextos — Toast Component (inline popup notification)
// ============================================================
import { useEffect, useState } from 'react'

interface Props {
  message: string
  type?: 'success' | 'error' | 'info'
  onDismiss: () => void
  duration?: number
}

export default function Toast({ message, type = 'info', onDismiss, duration = 3000 }: Props) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300)
    }, duration)
    return () => clearTimeout(t)
  }, [duration, onDismiss])

  const colors = {
    success: 'border-emerald-500/40 text-emerald-300',
    error:   'border-red-500/40 text-red-300',
    info:    'border-primary-500/40 text-primary-300',
  }

  const icons = { success: '✅', error: '❌', info: 'ℹ️' }

  return (
    <div
      className={`
        fixed top-3 left-1/2 -translate-x-1/2 z-50
        glass-card px-3 py-2 flex items-center gap-2
        border ${colors[type]} shadow-lg
        transition-all duration-300 max-w-[340px] w-[90%]
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
    >
      <span className="text-base flex-shrink-0">{icons[type]}</span>
      <span className="text-xs font-medium flex-1">{message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(onDismiss, 300) }}
        className="text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none flex-shrink-0"
      >
        ×
      </button>
    </div>
  )
}
