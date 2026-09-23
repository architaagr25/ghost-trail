import { useMemo } from 'react'
import { Bot, ChevronRight, User, X } from 'lucide-react'
import type { MapData } from '../lib/types'
import type { Selection } from '../lib/filters'
import { playerStats, survivalCurve } from '../lib/stats'
import { formatClock, formatMatchTime, shortId } from '../lib/format'
import { COLORS, cssColor } from '../map/style'
import { useApp } from '../state/store'
import { Legend } from './Legend'
import { SurvivalChart } from './SurvivalChart'

/**
 * Detail for whatever is currently in focus.
 *
 * Reading order runs from narrow to broad: the journey being inspected, then
 * the match it belongs to, then the key. The panel is always present so the
 * layout does not jump when a selection is made or cleared.
 */
export function DetailRail({
  data,
  selection,
  onCollapse,
}: {
  data: MapData
  selection: Selection
  onCollapse: () => void
}) {
  const selected = useApp((state) => state.selectedPlayer)
  const setSelected = useApp((state) => state.setSelectedPlayer)
  const time = useApp((state) => state.time)
  const match = selection.match

  const stats = useMemo(() => {
    if (!selected) return null
    // Events reference the map's full player list, so the index comes from
    // there rather than from the filtered view.
    return playerStats(selected, data.players.indexOf(selected), data.events)
  }, [selected, data])

  const survival = useMemo(
    () => (match ? survivalCurve(data, match) : []),
    [data, match],
  )

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-edge bg-panel">
      <section className="border-b border-edge px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="label text-accent">Trail acquired</p>
          <button
            type="button"
            aria-label="Hide details"
            onClick={onCollapse}
            className="-mr-2 grid h-6 w-6 place-items-center rounded text-ink-faint transition hover:bg-panel-raised hover:text-ink"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {!selected || !stats ? (
          <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
            Click a trail or an event marker on the map to inspect one player's journey.
          </p>
        ) : (
          <>
            <div className="mt-3 flex items-center gap-2.5">
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded border"
                style={{
                  borderColor: cssColor(selected.b ? COLORS.bot : COLORS.human),
                  color: cssColor(selected.b ? COLORS.bot : COLORS.human),
                }}
              >
                {selected.b ? <Bot size={15} /> : <User size={15} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{shortId(selected.u)}</p>
                <p className="label text-ink-faint">
                  {selected.b ? 'Bot' : 'Human operative'}
                </p>
              </div>
              <button
                type="button"
                aria-label="Clear selection"
                onClick={() => setSelected(null)}
                className="grid h-7 w-7 place-items-center rounded text-ink-faint transition hover:bg-panel-raised hover:text-ink"
              >
                <X size={13} />
              </button>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3">
              <Stat label="Outcome" value={stats.survived ? 'Extracted' : 'Down'} />
              <Stat label="Time on map" value={formatClock(stats.duration)} />
              <Stat label="Distance" value={`${(stats.distance / 1000).toFixed(2)} km`} />
              <Stat label="Pace" value={`${stats.pace.toFixed(1)} m/s`} />
              <Stat label="Kills" value={`${stats.kills}`} />
              <Stat label="Loot" value={`${stats.loot}`} />
            </dl>
          </>
        )}
      </section>

      <section className="border-b border-edge px-5 py-4">
        <p className="label text-accent">Match summary</p>

        {!match ? (
          <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
            {selection.matches.length
              ? `${selection.matches.length} matches in view. Select one to see its summary.`
              : 'No matches in view.'}
          </p>
        ) : (
          <>
            <p className="mt-2 text-xs text-ink">{formatMatchTime(match.start)}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
              <Stat label="Duration" value={formatClock(match.duration)} />
              <Stat label="Players" value={`${match.humans + match.bots}`} />
              <Stat label="Kills" value={`${match.kills}`} />
              <Stat label="Loot" value={`${match.loot}`} />
            </dl>

            <div className="mt-5">
              <SurvivalChart points={survival} duration={match.duration} time={time} />
            </div>
          </>
        )}
      </section>

      <section className="px-5 py-4">
        <Legend />
      </section>
    </aside>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-sm numeric text-ink">{value}</dd>
    </div>
  )
}
