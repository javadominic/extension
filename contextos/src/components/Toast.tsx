import { useEffect, useState } from 'react'
import { IconCheck, IconX } from './LucideIcons'

interface Props {
  message: string
  type?: 'success' | 'error' | 'info'
  onDismiss: () => void
  onUndo?: () => void
  duration?: number
}

export default function Toast({ message, type = 'info', onDismiss, onUndo, duration = 3000 }: Props) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 180)
    }, duration)
    return () => clearTimeout(t)
  }, [duration, onDismiss])

  const iconMap = {
    success: <IconCheck size={14} className="text-live flex-shrink-0" strokeWidth={2} />,
    error:   <IconX size={14} className="text-dead flex-shrink-0" strokeWidth={2} />,
    info:    <span className="w-2 h-2 rounded-full bg-amber flex-shrink-0" />,
  }

  return (
    <div
      className={`
        fixed top-3 left-1/2 -translate-x-1/2 z-50
        surface-card px-3 py-2 flex items-center gap-2
        border border-border shadow-md rounded-btn
        transition-[opacity,transform] duration-normal max-w-[340px] w-[90%] select-none
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1.5'}
      `}
      role="status"
    >
      {iconMap[type]}
      <span className="text-xs text-text flex-1 truncate">{message}</span>
      {onUndo && (
        <button
          onClick={() => { onUndo(); setVisible(false); setTimeout(onDismiss, 180) }}
          className="text-xs font-medium text-amber-text hover:underline flex-shrink-0 px-1"
        >
          Undo
        </button>
      )}
      <button
        onClick={() => { setVisible(false); setTimeout(onDismiss, 180) }}
        className="text-text-muted hover:text-text transition-colors p-0.5 flex-shrink-0"
        aria-label="Dismiss notification"
      >
        <IconX size={14} strokeWidth={1.5} />
      </button>
    </div>
  )
}
