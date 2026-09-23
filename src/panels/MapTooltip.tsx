import type { GameEvent, PlayerTrail } from '../lib/types'
import { formatClock, shortId } from '../lib/format'
import { EVENT_COLOR, EVENT_LABEL, cssColor } from '../map/style'

export interface HoverTarget {
  event: GameEvent
  player: PlayerTrail | undefined
  /** Pointer position within the stage, in CSS pixels. */
  x: number
  y: number
}

/**
 * Details for the event under the pointer.
 *
 * The card is offset from the cursor and flips to the other side near the right
 * edge, so it never covers the marker being inspected or falls off screen.
 */
export function MapTooltip({ target }: { target: HoverTarget }) {
  const { event, player } = target
  const flip = target.x > window.innerWidth - 240

  return (
    <div
      className="pointer-events-none absolute z-10 w-52 rounded border border-edge-bright bg-panel/95 px-3 py-2.5 shadow-lg backdrop-blur"
      style={{
        left: flip ? target.x - 220 : target.x + 16,
        top: Math.max(8, target.y - 20),
      }}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.15em]"
        style={{ color: cssColor(EVENT_COLOR[event.c]) }}
      >
        {EVENT_LABEL[event.c]}
      </p>

      <dl className="mt-2 space-y-1 text-[11px]">
        <Row label={event.b ? 'Bot' : 'Operative'} value={player ? shortId(player.u) : '—'} />
        <Row label="Match time" value={formatClock(event.t)} />
        <Row label="Position" value={`${Math.round(event.x)}, ${Math.round(event.z)}`} />
      </dl>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="numeric text-ink">{value}</dd>
    </div>
  )
}
