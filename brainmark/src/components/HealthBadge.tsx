// ============================================================
// Contextos — HealthBadge Component
// ============================================================
interface Props {
  status: 'alive' | 'dead' | 'unchecked'
  lastChecked?: number
}

export default function HealthBadge({ status, lastChecked }: Props) {
  const configs = {
    alive: {
      dot: 'bg-emerald-400',
      text: 'Live',
      container: 'text-emerald-400',
      title: 'Link is reachable',
    },
    dead: {
      dot: 'bg-red-400 animate-pulse',
      text: 'Dead',
      container: 'text-red-400',
      title: lastChecked
        ? `Link is broken · Last checked: ${new Date(lastChecked).toLocaleDateString()}`
        : 'Link appears to be broken',
    },
    unchecked: {
      dot: 'bg-slate-500',
      text: 'Unchecked',
      container: 'text-slate-500',
      title: 'Health not yet checked',
    },
  }

  const cfg = configs[status]

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold ${cfg.container}`}
      title={cfg.title}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.text}
    </span>
  )
}
