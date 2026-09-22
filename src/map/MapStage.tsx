import { useEffect, useMemo, useRef, useState } from 'react'
import { Application, Assets, Container, Sprite, Texture } from 'pixi.js'
import { Crosshair, Minus, Plus } from 'lucide-react'
import type { GameEvent, MapData } from '../lib/types'
import type { Selection } from '../lib/filters'
import { useApp, type HeatmapMode } from '../state/store'
import { HeatmapControl } from '../panels/HeatmapControl'
import { MapTooltip, type HoverTarget } from '../panels/MapTooltip'
import { MAP_SIZE } from './constants'
import { EventLayer } from './EventLayer'
import { HeatmapLayer } from './HeatmapLayer'
import { HitIndex } from './hitTest'
import { Projection } from './projection'
import { TrailLayer } from './TrailLayer'
import { Viewport } from './viewport'

/** Pointer slack in screen pixels when picking a marker or a trail. */
const EVENT_GRAB = 7
const TRAIL_GRAB = 5

/** A drag beyond this many pixels is a pan, not a click. */
const CLICK_SLOP = 4

interface MapStageProps {
  data: MapData
  selection: Selection
}

interface Scene {
  app: Application
  heatmap: HeatmapLayer
  trails: TrailLayer
  events: EventLayer
  projection: Projection
  viewport: Viewport
}

/**
 * The map canvas.
 *
 * Rendering runs on a WebGL stage rather than SVG or DOM nodes: an unfiltered
 * map carries tens of thousands of trail points, and only the GPU keeps panning
 * and playback smooth at that count.
 *
 * Setup and data are deliberately split across two effects. Building the Pixi
 * application and loading the minimap is expensive and depends only on which
 * map is open; changing a filter just pushes new arrays into the existing
 * layers, so the view neither flashes nor loses its pan and zoom.
 */
export function MapStage({ data, selection }: MapStageProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<Scene | null>(null)
  const hitRef = useRef<HitIndex | null>(null)
  const pressRef = useRef<{ x: number; y: number } | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [hover, setHover] = useState<HoverTarget | null>(null)
  const selected = useApp((state) => state.selectedPlayer)
  const setSelected = useApp((state) => state.setSelectedPlayer)

  const time = useApp((state) => state.time)
  const timeLimit = selection.match ? time : null
  const heatmap = useApp((state) => state.heatmap)
  const setHeatmap = useApp((state) => state.setHeatmap)
  const heatIntensity = useApp((state) => state.heatIntensity)
  const setHeatIntensity = useApp((state) => state.setHeatIntensity)
  const showTrails = useApp((state) => state.showTrails)
  const setShowTrails = useApp((state) => state.setShowTrails)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    // StrictMode mounts effects twice in development and init is async, so a
    // teardown can land mid-flight; this flag makes that a no-op.
    let cancelled = false
    let scene: Scene | null = null
    let cleanup: (() => void) | null = null

    async function start(host: HTMLDivElement) {
      const app = new Application()
      await app.init({
        resizeTo: host,
        antialias: true,
        backgroundAlpha: 0,
        // Cap the device pixel ratio. Retina displays otherwise quadruple the
        // fragment count for detail nobody can see on a minimap.
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
      })
      if (cancelled) {
        app.destroy(true)
        return
      }
      host.appendChild(app.canvas)

      const world = new Container()
      app.stage.addChild(world)

      const texture = await Assets.load<Texture>(data.image)
      if (cancelled) {
        app.destroy(true, { children: true })
        return
      }

      const minimap = new Sprite(texture)
      // Draw into the fixed logical square so nothing downstream has to know
      // the source image resolution.
      minimap.width = MAP_SIZE
      minimap.height = MAP_SIZE
      world.addChild(minimap)

      const projection = new Projection(data.config)
      const heatmap = new HeatmapLayer(projection)
      const trails = new TrailLayer(projection)
      const events = new EventLayer(projection)
      // Heat sits under the trails so it shades the ground they run over.
      world.addChild(heatmap.view, trails.view, events.view)

      const viewport = new Viewport(
        world,
        { width: host.clientWidth, height: host.clientHeight },
        // Keep strokes and markers a constant size on screen as the map scales.
        (zoom) => {
          trails.setZoom(zoom)
          events.setZoom(zoom)
        },
      )
      viewport.reset()

      scene = { app, heatmap, trails, events, projection, viewport }
      sceneRef.current = scene
      setReady(true)

      const observer = new ResizeObserver(() => {
        viewport.resize({ width: host.clientWidth, height: host.clientHeight })
      })
      observer.observe(host)

      function onWheel(event: WheelEvent) {
        event.preventDefault()

        // A trackpad pinch arrives as a wheel event with ctrlKey set, and a
        // two-finger swipe sideways arrives as horizontal delta. Treating every
        // wheel event as zoom made a sideways swipe do nothing, which read as
        // the map drifting for no reason.
        const sideways = Math.abs(event.deltaX) > Math.abs(event.deltaY)
        if (sideways && !event.ctrlKey) {
          viewport.panBy(event.deltaX, event.deltaY)
          return
        }

        const rect = app.canvas.getBoundingClientRect()
        // Normalize across mouse wheels and trackpads, which report very
        // different deltaY magnitudes for the same intent.
        const factor = Math.exp(-event.deltaY * 0.002)
        viewport.zoomBy(factor, event.clientX - rect.left, event.clientY - rect.top)
      }
      app.canvas.addEventListener('wheel', onWheel, { passive: false })

      cleanup = () => {
        observer.disconnect()
        app.canvas.removeEventListener('wheel', onWheel)
      }
    }

    start(host).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause))
    })

    return () => {
      cancelled = true
      cleanup?.()
      sceneRef.current = null
      hitRef.current = null
      setReady(false)
      scene?.app.destroy(true, { children: true })
    }
  }, [data])

  // Feed the current selection into the layers and rebuild the hit index.
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    scene.trails.setTrails(selection.players)
    scene.events.setEvents(selection.events)
    hitRef.current = new HitIndex(scene.projection, selection.players, selection.events)

    // A player filtered out of view must not stay highlighted.
    const { selectedPlayer, setSelectedPlayer } = useApp.getState()
    if (selectedPlayer && !selection.players.includes(selectedPlayer)) setSelectedPlayer(null)
    setHover(null)
  }, [selection, ready])

  useEffect(() => {
    sceneRef.current?.trails.setSelection(selected)
  }, [selected, ready])

  // The density field follows the same filters as everything else, so the heat
  // always describes exactly what is on screen.
  const heatPoints = useMemo(
    () => densityPoints(heatmap, selection, timeLimit),
    [heatmap, selection, timeLimit],
  )

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    scene.heatmap.setVisible(heatmap !== 'off')
    scene.heatmap.setIntensity(heatIntensity)
    if (heatmap !== 'off') scene.heatmap.setPoints(heatPoints)
  }, [heatmap, heatPoints, heatIntensity, ready])

  useEffect(() => {
    sceneRef.current?.trails.setVisible(showTrails)
  }, [showTrails, ready])

  // Playback only has a meaning within one match. Across several there is no
  // shared clock, so the layers draw everything instead.
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    scene.trails.setTimeLimit(timeLimit)
    scene.events.setTimeLimit(timeLimit)
  }, [timeLimit, ready, selection])

  const viewport = () => sceneRef.current?.viewport ?? null

  /** Pointer position relative to the stage, in CSS pixels. */
  function localPoint(event: React.PointerEvent): [number, number] {
    const rect = event.currentTarget.getBoundingClientRect()
    return [event.clientX - rect.left, event.clientY - rect.top]
  }

  function updateHover(event: React.PointerEvent): void {
    const view = viewport()
    const hits = hitRef.current
    if (!view || !hits || view.isDragging) {
      if (hover) setHover(null)
      return
    }

    const [localX, localY] = localPoint(event)
    const [mapX, mapY] = view.toMap(localX, localY)
    const found = hits.eventAt(mapX, mapY, EVENT_GRAB * view.unitsPerPixel)

    if (!found) {
      if (hover) setHover(null)
      return
    }
    if (hover?.event === found) return

    // Events carry an index into the map's full player list, which stays valid
    // whatever the filters are doing.
    setHover({ event: found, player: data.players[found.p], x: localX, y: localY })
  }

  function pick(event: React.PointerEvent): void {
    const view = viewport()
    const hits = hitRef.current
    if (!view || !hits) return

    const [localX, localY] = localPoint(event)
    const [mapX, mapY] = view.toMap(localX, localY)

    // A marker resolves to the player it belongs to, so clicking a kill pulls
    // up the journey that produced it.
    const marker = hits.eventAt(mapX, mapY, EVENT_GRAB * view.unitsPerPixel)
    if (marker) {
      setSelected(data.players[marker.p] ?? null)
      return
    }

    // Clicking bare ground clears, which is the obvious way out.
    setSelected(hits.playerAt(mapX, mapY, TRAIL_GRAB * view.unitsPerPixel))
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-void">
      <div
        ref={hostRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          pressRef.current = { x: event.clientX, y: event.clientY }
          viewport()?.beginDrag(event.clientX, event.clientY)
        }}
        onPointerMove={(event) => {
          viewport()?.drag(event.clientX, event.clientY)
          updateHover(event)
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId)
          viewport()?.endDrag()

          // Panning ends on the same pointerup a click would. Only treat it as
          // a pick if the pointer barely moved.
          const press = pressRef.current
          pressRef.current = null
          if (!press) return
          if (Math.hypot(event.clientX - press.x, event.clientY - press.y) <= CLICK_SLOP) {
            pick(event)
          }
        }}
        onPointerLeave={() => {
          viewport()?.endDrag()
          pressRef.current = null
          setHover(null)
        }}
      />

      <div className="pointer-events-none absolute left-6 top-5 select-none">
        <p className="text-[10px] uppercase tracking-[0.25em] text-ink-faint">Map sector</p>
        <h2 className="text-xl font-medium tracking-wide text-ink">{data.label}</h2>
      </div>

      {hover && <MapTooltip target={hover} />}

      {ready && (
        <div className="absolute left-1/2 top-5 -translate-x-1/2">
          <HeatmapControl
            mode={heatmap}
            count={heatPoints.length}
            intensity={heatIntensity}
            showTrails={showTrails}
            onChange={setHeatmap}
            onIntensity={setHeatIntensity}
            onToggleTrails={setShowTrails}
          />
        </div>
      )}

      {ready && (
        <div className="absolute right-5 top-5 flex flex-col gap-1.5">
          <StageButton label="Zoom in" onClick={() => viewport()?.zoomIn()}>
            <Plus size={15} />
          </StageButton>
          <StageButton label="Zoom out" onClick={() => viewport()?.zoomOut()}>
            <Minus size={15} />
          </StageButton>
          <StageButton label="Reset view" onClick={() => viewport()?.reset()}>
            <Crosshair size={15} />
          </StageButton>
        </div>
      )}

      {!ready && !error && (
        <p className="absolute inset-0 grid place-items-center text-xs uppercase tracking-[0.3em] text-ink-faint">
          Loading map
        </p>
      )}

      {error && (
        <p className="absolute inset-0 grid place-items-center px-8 text-center text-sm text-alert">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * The points behind each density field.
 *
 * Kill zones plot where kills were taken from and death zones where players
 * went down -- two different questions about the same fight, and a designer
 * reading cover and sightlines needs them apart. Storm deaths count towards
 * deaths: the question is where players die, and the storm is one of the ways.
 *
 * During playback the field is built only from what has happened so far, the
 * same cut the trails and markers use. A field that showed the whole match
 * while the trails were still drawing would be answering a different question
 * from everything around it.
 */
function densityPoints(
  mode: HeatmapMode,
  selection: Selection,
  limit: number | null,
): Array<{ x: number; z: number }> {
  if (mode === 'off') return []

  if (mode === 'traffic') {
    const points: Array<{ x: number; z: number }> = []
    for (const player of selection.players) {
      for (let i = 0; i < player.x.length; i += 1) {
        if (limit !== null && player.t[i] > limit) break
        points.push({ x: player.x[i], z: player.z[i] })
      }
    }
    return points
  }

  const wanted =
    mode === 'kills'
      ? (category: GameEvent['c']) => category === 'kill'
      : (category: GameEvent['c']) => category === 'death' || category === 'storm'

  return selection.scopedEvents.filter(
    (event) => wanted(event.c) && (limit === null || event.t <= limit),
  )
}

function StageButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded border border-edge bg-panel/80 text-ink-dim backdrop-blur transition hover:border-edge-bright hover:text-signal"
    >
      {children}
    </button>
  )
}
