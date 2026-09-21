import type { EventCategory } from '../lib/types'
import { COLORS, EVENT_COLOR, EVENT_LABEL, cssColor } from '../map/style'

/** Marker glyphs, drawn to match the shapes the canvas renders. */
const GLYPHS: Record<EventCategory, string> = {
  kill: 'M8 1 L9.6 6.4 L15 8 L9.6 9.6 L8 15 L6.4 9.6 L1 8 L6.4 6.4 Z',
  death: 'M3.4 1.6 L8 6.2 L12.6 1.6 L14.4 3.4 L9.8 8 L14.4 12.6 L12.6 14.4 L8 9.8 L3.4 14.4 L1.6 12.6 L6.2 8 L1.6 3.4 Z',
  loot: 'M8 1.5 L14.5 8 L8 14.5 L1.5 8 Z',
  storm: 'M8 1.5 L14.5 13 L1.5 13 Z',
}

const CATEGORIES: EventCategory[] = ['kill', 'death', 'loot', 'storm']

export function Legend() {
  return (
    <div className="pointer-events-none absolute bottom-5 left-6 select-none rounded border border-edge bg-panel/80 px-3.5 py-3 backdrop-blur">
      <p className="mb-2.5 text-[10px] uppercase tracking-[0.25em] text-ink-faint">Signal legend</p>

      <ul className="space-y-1.5 text-[11px] text-ink-dim">
        <li className="flex items-center gap-2.5">
          <svg width="26" height="8" aria-hidden>
            <line x1="1" y1="4" x2="25" y2="4" stroke={cssColor(COLORS.human)} strokeWidth="2" />
          </svg>
          Human trajectory
        </li>
        <li className="flex items-center gap-2.5">
          <svg width="26" height="8" aria-hidden>
            <line
              x1="1"
              y1="4"
              x2="25"
              y2="4"
              stroke={cssColor(COLORS.bot)}
              strokeWidth="2"
              strokeDasharray="5 4"
            />
          </svg>
          Bot trajectory
        </li>

        {CATEGORIES.map((category) => (
          <li key={category} className="flex items-center gap-2.5">
            <svg width="26" height="14" viewBox="-5 0 26 16" aria-hidden>
              <path
                d={GLYPHS[category]}
                fill={cssColor(EVENT_COLOR[category])}
              />
            </svg>
            {EVENT_LABEL[category]}
          </li>
        ))}
      </ul>
    </div>
  )
}
