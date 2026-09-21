import { useMemo } from 'react'
import { useApp } from '../state/store'
import { ALL, matchesForDate } from '../lib/filters'
import { formatDate } from '../lib/format'
import type { Selection } from '../lib/filters'
import { Field } from '../ui/Field'
import { Select, type Option } from '../ui/Select'
import { MatchPicker } from './MatchPicker'

/**
 * The query controls.
 *
 * Ordered the way a designer narrows down: which map, then which day, then
 * which match. Each control shows how much data sits behind it so the scope of
 * what is on screen is never a guess.
 */
export function FilterRail({ selection }: { selection: Selection }) {
  const index = useApp((state) => state.index)
  const mapKey = useApp((state) => state.mapKey)
  const mapData = useApp((state) => state.mapData)
  const date = useApp((state) => state.date)
  const matchId = useApp((state) => state.matchId)
  const selectMap = useApp((state) => state.selectMap)
  const setDate = useApp((state) => state.setDate)
  const setMatch = useApp((state) => state.setMatch)

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

  const humans = selection.players.filter((player) => !player.b).length
  const bots = selection.players.length - humans

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
      </div>

      <div className="border-t border-edge bg-panel-raised px-5 py-4">
        <p className="text-[10px] uppercase tracking-[0.25em] text-ink-faint">Query result</p>
        <p className="mt-1.5 text-xs text-ink">
          {selection.matches.length} {selection.matches.length === 1 ? 'match' : 'matches'} ·{' '}
          {humans} human · {bots} bot
        </p>
        <p className="mt-0.5 text-[11px] text-ink-faint">{selection.events.length} events</p>
      </div>
    </aside>
  )
}
