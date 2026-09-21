import { useEffect, useState } from 'react'
import { Crosshair } from 'lucide-react'
import { MapStage } from './map/MapStage'
import { loadIndex, loadMap } from './lib/data'
import type { MapData } from './lib/types'

export default function App() {
  const [map, setMap] = useState<MapData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadIndex()
      .then((index) => {
        const first = index.maps[0]
        if (!first) throw new Error('No maps found in the data index.')
        return loadMap(first.file)
      })
      .then((data) => {
        if (!cancelled) setMap(data)
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause))
      })
    return () => {
      cancelled = true
    }
  }, [])

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

      <main className="min-h-0 flex-1">
        {error && (
          <p className="grid h-full place-items-center px-8 text-center text-sm text-alert">{error}</p>
        )}
        {!error && !map && (
          <p className="grid h-full place-items-center text-xs uppercase tracking-[0.3em] text-ink-faint">
            Loading telemetry
          </p>
        )}
        {map && <MapStage data={map} />}
      </main>
    </div>
  )
}
