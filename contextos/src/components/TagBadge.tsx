interface Props {
  tag: string
  onClick?: () => void
  active?: boolean
}

export default function TagBadge({ tag, onClick, active }: Props) {
  const style = active
    ? 'chip-selected'
    : 'chip-neutral'

  return (
    <button
      className={`${style} select-none ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={onClick}
      title={`#${tag}`}
    >
      #{tag}
    </button>
  )
}
