interface Props {
  status: 'alive' | 'dead' | 'unchecked'
  lastChecked?: number
}

export default function HealthBadge({ status, lastChecked }: Props) {
  const configs = {
    alive: {
      dot: 'bg-live',
      text: 'Live',
      container: 'text-live',
      title: 'Link reachable',
    },
    dead: {
      dot: 'bg-dead',
      text: 'Dead',
      container: 'text-dead',
      title: lastChecked
        ? `Broken · Last checked ${new Date(lastChecked).toLocaleDateString()}`
        : 'Link unreachable',
    },
    unchecked: {
      dot: 'bg-text-muted',
      text: 'Unchecked',
      container: 'text-text-muted',
      title: 'Health not checked',
    },
  }

  const cfg = configs[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${cfg.container}`}
      title={cfg.title}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      <span>{cfg.text}</span>
    </span>
  )
}
