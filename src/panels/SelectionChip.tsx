import { X } from 'lucide-react'
import type { PlayerTrail } from '../lib/types'
import { shortId } from '../lib/format'
import { COLORS, cssColor } from '../map/style'

/**
 * Confirms which journey is currently picked out, and offers a way back.
 *
 * Dimming the other trails shows that something is selected but not what, and a
 * highlighted path at the far end of the map is easy to lose track of.
 */
export function SelectionChip({
  player,
  onClear,
}: {
  player: PlayerTrail
  onClear: () => void
}) {
  const color = cssColor(player.b ? COLORS.bot : COLORS.human)

  return (
    <div className="absolute left-6 top-20 flex items-center gap-2.5 rounded border border-edge-bright bg-panel/90 py-1.5 pl-3 pr-1.5 backdrop-blur">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="text-xs text-ink">{shortId(player.u)}</span>
      <span className="text-[10px] uppercase tracking-[0.15em] text-ink-faint">
        {player.b ? 'Bot' : 'Human'}
      </span>
      <button
        type="button"
        aria-label="Clear selection"
        onClick={onClear}
        className="grid h-6 w-6 place-items-center rounded text-ink-faint transition hover:bg-panel-raised hover:text-ink"
      >
        <X size={13} />
      </button>
    </div>
  )
}
