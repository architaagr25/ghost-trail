import * as Slider from '@radix-ui/react-slider'
import { Eye, EyeOff } from 'lucide-react'
import { rampCss } from '../map/heatmap'
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

/** Range of the intensity multiplier, either side of the default. */
const MIN_INTENSITY = 0.4
const MAX_INTENSITY = 3

/**
 * Controls for the density overlay.
 *
 * A segmented control rather than checkboxes: two fields overlaid would sum
 * into a colour that means nothing, so exactly one is on at a time and the
 * control says which. The ramp key, the intensity and the trail toggle only
 * appear once a field is on, so the map stays clear when it is not.
 */
export function HeatmapControl({
  mode,
  count,
  intensity,
  showTrails,
  onChange,
  onIntensity,
  onToggleTrails,
}: {
  mode: HeatmapMode
  /** Points behind the active field, so an empty overlay explains itself. */
  count: number
  intensity: number
  showTrails: boolean
  onChange: (mode: HeatmapMode) => void
  onIntensity: (intensity: number) => void
  onToggleTrails: (show: boolean) => void
}) {
  const active = mode !== 'off'

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
            className={`rounded px-3 py-1.5 label transition ${
              option.value === mode
                ? 'bg-panel-raised text-signal'
                : 'text-ink-faint hover:text-ink-dim'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {active && count === 0 && (
        <p className="rounded bg-panel/80 px-2 py-1 text-[10px] text-ink-faint backdrop-blur">
          Nothing to plot in this selection
        </p>
      )}

      {active && count > 0 && (
        <div className="flex items-center gap-3 rounded border border-edge bg-panel/80 px-3 py-2 backdrop-blur">
          <div className="flex items-center gap-1.5">
            <span className="label text-ink-faint">Low</span>
            {/* Painted from the same stops the canvas uses. */}
            <span
              className="h-2 w-16 rounded-sm"
              style={{ background: rampCss() }}
              aria-hidden
            />
            <span className="label text-ink-faint">High</span>
          </div>

          <span className="h-4 w-px bg-edge" aria-hidden />

          <Slider.Root
            value={[intensity]}
            min={MIN_INTENSITY}
            max={MAX_INTENSITY}
            step={0.1}
            onValueChange={([next]) => onIntensity(next)}
            aria-label="Heatmap intensity"
            title="Intensity — raise it to pull out quieter areas"
            className="relative flex h-4 w-24 touch-none select-none items-center"
          >
            <Slider.Track className="relative h-0.5 w-full grow rounded bg-edge-bright">
              <Slider.Range className="absolute h-full rounded bg-signal" />
            </Slider.Track>
            <Slider.Thumb className="block h-3 w-3 rounded-full border-2 border-void bg-signal focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-dim" />
          </Slider.Root>

          <span className="h-4 w-px bg-edge" aria-hidden />

          <button
            type="button"
            aria-pressed={!showTrails}
            title={showTrails ? 'Hide trails to read the field alone' : 'Show trails'}
            onClick={() => onToggleTrails(!showTrails)}
            className={`flex items-center gap-1.5 rounded px-1.5 py-1 label transition ${
              showTrails ? 'text-ink-faint hover:text-ink-dim' : 'text-signal'
            }`}
          >
            {showTrails ? <Eye size={12} /> : <EyeOff size={12} />}
            Trails
          </button>
        </div>
      )}
    </div>
  )
}
