import { useRef } from 'react'
import { IconSearch, IconX } from './LucideIcons'

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
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none flex items-center justify-center">
        {loading ? (
          <span className="inline-block w-3.5 h-3.5 border-2 border-amber border-t-transparent rounded-full animate-spin" />
        ) : (
          <IconSearch size={15} strokeWidth={1.5} />
        )}
      </span>
      <input
        ref={inputRef}
        id="search-input"
        className="input-field pl-9 pr-8"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Search saves'}
        autoComplete="off"
        autoFocus
      />
      {value && (
        <button
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors p-1"
          onClick={() => { onChange(''); inputRef.current?.focus() }}
          aria-label="Clear search"
        >
          <IconX size={14} strokeWidth={1.5} />
        </button>
      )}
    </div>
  )
}
