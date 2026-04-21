// ============================================================
// BrainMark — TagBadge Component
// ============================================================
interface Props {
  tag: string
  onClick?: () => void
  active?: boolean
}

export default function TagBadge({ tag, onClick, active }: Props) {
  const base =
    'inline-flex items-center text-[10px] font-semibold rounded-full px-2 py-0.5 transition-all duration-150 select-none'
  const style = active
    ? 'bg-primary-500/30 text-primary-300 border border-primary-500/50'
    : 'bg-primary-500/10 text-primary-400 border border-primary-500/20 hover:bg-primary-500/20 hover:border-primary-500/40'

  return (
    <button
      className={`${base} ${style} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={onClick}
      title={`#${tag}`}
    >
      #{tag}
    </button>
  )
}
