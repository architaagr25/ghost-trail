import { useMemo } from 'react'
import { Bot, User } from 'lucide-react'
import { useApp } from '../state/store'
import { ALL, EVENT_CATEGORIES, matchesForDate, type Selection } from '../lib/filters'
import { formatDate } from '../lib/format'
import { EVENT_COLOR, EVENT_LABEL, cssColor } from '../map/style'
import { Field } from '../ui/Field'
import { Select, type Option } from '../ui/Select'
import { MatchPicker } from './MatchPicker'

/**
 * The query controls.
 *
 * Ordered the way a designer narrows down: which map, then which day, then
 * which match, then what to show within it. Every control carries the count
 * behind it, so the scope of what is on screen is never a guess.
 */
export function FilterRail({ selection }: { selection: Selection }) {
  const index = useApp((state) => state.index)
  const mapKey = useApp((state) => state.mapKey)
  const mapData = useApp((state) => state.mapData)
  const date = useApp((state) => state.date)
  const matchId = useApp((state) => state.matchId)
  const showHumans = useApp((state) => state.showHumans)
  const showBots = useApp((state) => state.showBots)
  const events = useApp((state) => state.events)
  const selectMap = useApp((state) => state.selectMap)
  const setDate = useApp((state) => state.setDate)
  const setMatch = useApp((state) => state.setMatch)
  const toggleClass = useApp((state) => state.toggleClass)
  const toggleEvent = useApp((state) => state.toggleEvent)

  const mapOptions: Option[] = (index?.maps ?? []).map((map) => ({
    value: map.map,
    label: map.label,
    hint: `${map.matches}`,
  }))

  const dateOptions: Option[] = useMemo(() => {
    const entry = index?.maps.find((map) => map.map === mapKey)
    const counts = new Map<string, number>()
    for (const match of mapData?.matches ?? []) {
      counts.set(match.date, (counts.get(match.date) ?? 0) + 1)
    }
    return [
      { value: ALL, label: 'All dates', hint: `${entry?.matches ?? 0}` },
      ...(entry?.dates ?? []).map((value) => ({
        value,
        label: formatDate(value),
        hint: `${counts.get(value) ?? 0}`,
      })),
    ]
  }, [index, mapKey, mapData])

  const pickable = useMemo(
    () => (mapData ? matchesForDate(mapData, date) : []),
    [mapData, date],
  )

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-edge bg-panel">
      <div className="border-b border-edge px-5 py-4">
        <p className="text-[10px] uppercase tracking-[0.25em] text-signal-dim">Query control</p>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <Field label="Map sector">
          <Select
            ariaLabel="Map"
            value={mapKey ?? ''}
            options={mapOptions}
            onChange={(value) => void selectMap(value)}
          />
        </Field>

        <Field label="Date">
          <Select ariaLabel="Date" value={date} options={dateOptions} onChange={setDate} />
        </Field>

        <Field label="Match">
          <MatchPicker matches={pickable} value={matchId} onChange={setMatch} />
        </Field>

        <Field label="Player class">
          <div className="grid grid-cols-2 gap-1.5">
            <ClassToggle
              icon={<User size={13} />}
              label="Human"
              count={selection.totals.humans}
              active={showHumans}
              onClick={() => toggleClass('humans')}
            />
            <ClassToggle
              icon={<Bot size={13} />}
              label="Bot"
              count={selection.totals.bots}
              active={showBots}
              onClick={() => toggleClass('bots')}
            />
          </div>
        </Field>

        <Field label="Event signals">
          <ul className="space-y-0.5">
            {EVENT_CATEGORIES.map((category) => (
              <li key={category}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded px-1.5 py-2 transition hover:bg-panel-raised">
                  <input
                    type="checkbox"
                    checked={events[category]}
                    onChange={() => toggleEvent(category)}
                    className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-signal"
                  />
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: cssColor(EVENT_COLOR[category]) }}
                  />
                  <span className="flex-1 text-xs text-ink-dim">{EVENT_LABEL[category]}</span>
                  <span className="text-[10px] tabular-nums text-ink-faint">
                    {selection.totals.events[category]}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Field>
      </div>

      <div className="border-t border-edge bg-panel-raised px-5 py-4">
        <p className="text-[10px] uppercase tracking-[0.25em] text-ink-faint">Query result</p>
        <p className="mt-1.5 text-xs text-ink">
          {selection.matches.length} {selection.matches.length === 1 ? 'match' : 'matches'} ·{' '}
          {selection.players.length} shown
        </p>
        <p className="mt-0.5 text-[11px] text-ink-faint">{selection.events.length} events plotted</p>
      </div>
    </aside>
  )
}

function ClassToggle({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded border px-2 py-2.5 text-xs transition ${
        active
          ? 'border-signal-dim bg-panel-raised text-signal'
          : 'border-edge text-ink-faint hover:border-edge-bright'
      }`}
    >
      {icon}
      {label}
      <span className="text-[10px] tabular-nums opacity-70">{count}</span>
    </button>
  )
}
