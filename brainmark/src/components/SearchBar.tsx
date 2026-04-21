// ============================================================
// Contextos — SearchBar Component
// ============================================================
import { useRef } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  loading?: boolean
}

export default function SearchBar({ value, onChange, placeholder, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-base pointer-events-none">
        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          '🔍'
        )}
      </span>
      <input
        ref={inputRef}
        id="search-input"
        className="input-field pl-9 pr-8"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Search bookmarks…'}
        autoComplete="off"
        autoFocus
      />
      {value && (
        <button
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          onClick={() => { onChange(''); inputRef.current?.focus() }}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  )
}
