import type { HeatmapMode } from '../state/store'

interface Mode {
  value: HeatmapMode
  label: string
  /** What the field is built from, for the tooltip. */
  title: string
}

const MODES: Mode[] = [
  { value: 'off', label: 'Off', title: 'Hide the density overlay' },
  { value: 'kills', label: 'Kills', title: 'Where players take kills from' },
  { value: 'deaths', label: 'Deaths', title: 'Where players go down, storm included' },
  { value: 'traffic', label: 'Traffic', title: 'Where players spend their time' },
]

/**
 * Picks which density field is drawn.
 *
 * A segmented control rather than checkboxes: two fields overlaid would sum
 * into a colour that means nothing, so exactly one is on at a time and the
 * control says which.
 */
export function HeatmapControl({
  mode,
  count,
  onChange,
}: {
  mode: HeatmapMode
  /** Points behind the active field, so an empty overlay explains itself. */
  count: number
  onChange: (mode: HeatmapMode) => void
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex rounded border border-edge bg-panel/80 p-0.5 backdrop-blur">
        {MODES.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.title}
            aria-pressed={option.value === mode}
            onClick={() => onChange(option.value)}
            className={`rounded px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] transition ${
              option.value === mode
                ? 'bg-panel-raised text-signal'
                : 'text-ink-faint hover:text-ink-dim'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode !== 'off' && count === 0 && (
        <p className="rounded bg-panel/80 px-2 py-1 text-[10px] text-ink-faint backdrop-blur">
          Nothing to plot in this selection
        </p>
      )}
    </div>
  )
}
