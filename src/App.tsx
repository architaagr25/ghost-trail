import { useEffect, useMemo } from 'react'
import { Crosshair } from 'lucide-react'
import { MapStage } from './map/MapStage'
import { FilterRail } from './panels/FilterRail'
import { Timeline } from './panels/Timeline'
import { EMPTY_SELECTION, selectData } from './lib/filters'
import { useApp } from './state/store'
import { usePlayback } from './state/usePlayback'

export default function App() {
  const init = useApp((state) => state.init)
  const status = useApp((state) => state.status)
  const error = useApp((state) => state.error)
  const mapData = useApp((state) => state.mapData)
  const date = useApp((state) => state.date)
  const matchId = useApp((state) => state.matchId)
  const showHumans = useApp((state) => state.showHumans)
  const showBots = useApp((state) => state.showBots)
  const events = useApp((state) => state.events)

  useEffect(() => {
    void init()
  }, [init])

  const selection = useMemo(
    () =>
      mapData
        ? selectData(mapData, { date, matchId, showHumans, showBots, events })
        : EMPTY_SELECTION,
    [mapData, date, matchId, showHumans, showBots, events],
  )

  usePlayback(selection.match ? Math.max(selection.match.duration, 1) : null)

  return (
    <div className="flex h-full flex-col bg-void">
      <header className="flex items-center gap-3 border-b border-edge px-6 py-3">
        <span className="grid h-8 w-8 place-items-center rounded border border-signal-dim text-signal">
          <Crosshair size={16} />
        </span>
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink">Ghost Trail</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            Lila Black / Level Intel
          </p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <FilterRail selection={selection} />

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="relative min-h-0 flex-1">
            {error && (
              <p className="grid h-full place-items-center px-8 text-center text-sm text-alert">
                {error}
              </p>
            )}
            {!error && status === 'loading' && (
              <p className="grid h-full place-items-center text-xs uppercase tracking-[0.3em] text-ink-faint">
                Loading telemetry
              </p>
            )}
            {!error && mapData && status === 'ready' && (
              <MapStage data={mapData} selection={selection} />
            )}
          </main>

          <Timeline selection={selection} />
        </div>
      </div>
    </div>
  )
}
