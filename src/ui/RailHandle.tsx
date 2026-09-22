import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * The stub a collapsed rail leaves behind.
 *
 * A rail that vanishes entirely is a rail nobody finds again, so a labelled
 * strip stays in the layout. The text runs vertically because the strip is only
 * wide enough for an icon, and the chevron points the way the panel will open.
 */
export function RailHandle({
  side,
  label,
  onClick,
}: {
  side: 'left' | 'right'
  label: string
  onClick: () => void
}) {
  const Chevron = side === 'left' ? ChevronRight : ChevronLeft

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Show ${label.toLowerCase()}`}
      className={`flex w-9 shrink-0 flex-col items-center gap-3 bg-panel py-4 text-ink-faint transition hover:text-signal ${
        side === 'left' ? 'border-r border-edge' : 'border-l border-edge'
      }`}
    >
      <Chevron size={15} />
      <span
        className="text-[10px] uppercase tracking-[0.25em]"
        style={{ writingMode: 'vertical-rl' }}
      >
        {label}
      </span>
    </button>
  )
}
