import { useEffect, useMemo } from 'react'
import { Crosshair, TriangleAlert } from 'lucide-react'
import { MapStage } from './map/MapStage'
import { DetailRail } from './panels/DetailRail'
import { FilterRail } from './panels/FilterRail'
import { Timeline } from './panels/Timeline'
import { EMPTY_SELECTION, selectData } from './lib/filters'
import { useApp } from './state/store'
import { useKeyboard } from './state/useKeyboard'
import { usePlayback } from './state/usePlayback'
import { RailHandle } from './ui/RailHandle'
import { Loading, StatusPanel } from './ui/Status'
import { useRailLayout } from './ui/useRailLayout'

/**
 * Two rails at 288px plus a map needs room. Below this the map gets squeezed to
 * the point of being unreadable, which defeats the purpose of the tool, so the
 * rails start collapsed and open over the map rather than beside it.
 */
const WIDE = '(min-width: 1280px)'

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

  const { wide, filtersOpen, detailsOpen, setFiltersOpen, setDetailsOpen } =
    useRailLayout(WIDE)

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

  const duration = selection.match ? Math.max(selection.match.duration, 1) : null
  usePlayback(duration)
  useKeyboard(duration)

  // On a wide screen the rails sit in the flex row. On a narrow one they float
  // over the map, so the map keeps its full width either way.
  const floating = 'absolute inset-y-0 z-20 shadow-2xl shadow-black/60'

  return (
    <div className="flex h-full flex-col bg-void">
      <header className="flex items-center gap-3 border-b border-edge px-4 py-3 sm:px-6">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded border border-signal-dim text-signal">
          <Crosshair size={16} />
        </span>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink">Ghost Trail</h1>
          <p className="truncate text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            Lila Black / Level Intel
          </p>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {filtersOpen ? (
          <div className={wide ? 'contents' : `${floating} left-0`}>
            <FilterRail selection={selection} onCollapse={() => setFiltersOpen(false)} />
          </div>
        ) : (
          <RailHandle side="left" label="Query" onClick={() => setFiltersOpen(true)} />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="relative min-h-0 flex-1">
            {error && (
              <StatusPanel
                tone="alert"
                icon={<TriangleAlert size={17} />}
                title="Telemetry unavailable"
                hint={error}
                action={{ label: 'Retry', onClick: () => void init() }}
              />
            )}
            {!error && status === 'loading' && <Loading label="Loading telemetry" />}
            {!error && mapData && status === 'ready' && (
              <MapStage data={mapData} selection={selection} />
            )}
          </main>

          <Timeline selection={selection} />
        </div>

        {mapData &&
          (detailsOpen ? (
            <div className={wide ? 'contents' : `${floating} right-0`}>
              <DetailRail
                data={mapData}
                selection={selection}
                onCollapse={() => setDetailsOpen(false)}
              />
            </div>
          ) : (
            <RailHandle side="right" label="Detail" onClick={() => setDetailsOpen(true)} />
          ))}
      </div>
    </div>
  )
}
