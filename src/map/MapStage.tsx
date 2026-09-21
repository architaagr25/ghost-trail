import { useEffect, useRef, useState } from 'react'
import { Application, Assets, Container, Sprite, Texture } from 'pixi.js'
import { Crosshair, Minus, Plus } from 'lucide-react'
import { Legend } from '../panels/Legend'
import type { MapData } from '../lib/types'
import { MAP_SIZE } from './constants'
import { EventLayer } from './EventLayer'
import { HitIndex } from './hitTest'
import { Projection } from './projection'
import { TrailLayer } from './TrailLayer'
import { Viewport } from './viewport'
import { MapTooltip, type HoverTarget } from '../panels/MapTooltip'
import { SelectionChip } from '../panels/SelectionChip'

/** Pointer slack in screen pixels when picking a marker or a trail. */
const EVENT_GRAB = 7
const TRAIL_GRAB = 5

/** A drag beyond this many pixels is a pan, not a click. */
const CLICK_SLOP = 4

interface MapStageProps {
  data: MapData
}

/**
 * The map canvas.
 *
 * Rendering runs on a WebGL stage rather than SVG or DOM nodes: a busy map can
 * carry tens of thousands of trail points, and only the GPU keeps panning and
 * playback smooth at that count.
 *
 * Layers are added to a single `world` container that the viewport transforms,
 * so every future layer inherits pan and zoom for free.
 */
export function MapStage({ data }: MapStageProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<Viewport | null>(null)
  const hitRef = useRef<HitIndex | null>(null)
  const trailsRef = useRef<TrailLayer | null>(null)
  const pressRef = useRef<{ x: number; y: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [hover, setHover] = useState<HoverTarget | null>(null)
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let app: Application | null = null
    // StrictMode mounts effects twice in development. The init below is async,
    // so a teardown can land mid-flight; this flag makes that a no-op.
    let cancelled = false

    async function start(host: HTMLDivElement) {
      const instance = new Application()
      await instance.init({
        resizeTo: host,
        antialias: true,
        backgroundAlpha: 0,
        // Cap the device pixel ratio. Retina displays otherwise quadruple the
        // fragment count for detail nobody can see on a minimap.
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
      })
      if (cancelled) {
        instance.destroy(true)
        return
      }

      app = instance
      host.appendChild(instance.canvas)

      const world = new Container()
      instance.stage.addChild(world)

      const texture = await Assets.load<Texture>(data.image)
      if (cancelled) return

      const minimap = new Sprite(texture)
      // Draw the minimap into the fixed logical square so the rest of the app
      // never has to know the source image resolution.
      minimap.width = MAP_SIZE
      minimap.height = MAP_SIZE
      world.addChild(minimap)

      const projection = new Projection(data.config)

      const trails = new TrailLayer(projection)
      trails.setTrails(data.players)
      world.addChild(trails.view)
      trailsRef.current = trails

      hitRef.current = new HitIndex(projection, data.players, data.events)

      const events = new EventLayer(projection)
      events.setEvents(data.events)
      world.addChild(events.view)

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
      viewportRef.current = viewport
      setReady(true)

      const observer = new ResizeObserver(() => {
        viewport.resize({ width: host.clientWidth, height: host.clientHeight })
      })
      observer.observe(host)
      instance.canvas.addEventListener('wheel', onWheel, { passive: false })
      cleanup = () => {
        observer.disconnect()
        instance.canvas.removeEventListener('wheel', onWheel)
      }

      function onWheel(event: WheelEvent) {
        event.preventDefault()
        const rect = instance.canvas.getBoundingClientRect()
        // Normalize across mouse wheels and trackpads, which report wildly
        // different deltaY magnitudes for the same intent.
        const factor = Math.exp(-event.deltaY * 0.002)
        viewport.zoomBy(factor, event.clientX - rect.left, event.clientY - rect.top)
      }
    }

    let cleanup: (() => void) | null = null
    start(host).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause))
    })

    return () => {
      cancelled = true
      cleanup?.()
      viewportRef.current = null
      hitRef.current = null
      trailsRef.current = null
      app?.destroy(true, { children: true })
      app = null
    }
  }, [data])

  useEffect(() => {
    trailsRef.current?.setSelection(selected)
  }, [selected, ready])

  // A new map means the previous map's indices mean nothing.
  useEffect(() => {
    setSelected(null)
    setHover(null)
  }, [data])

  const viewport = () => viewportRef.current

  /** Pointer position relative to the stage, in CSS pixels. */
  function localPoint(event: React.PointerEvent): [number, number] {
    const rect = event.currentTarget.getBoundingClientRect()
    return [event.clientX - rect.left, event.clientY - rect.top]
  }

  function updateHover(event: React.PointerEvent): void {
    const view = viewportRef.current
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

    setHover({ event: found, player: data.players[found.p], x: localX, y: localY })
  }

  function pick(event: React.PointerEvent): void {
    const view = viewportRef.current
    const hits = hitRef.current
    if (!view || !hits) return

    const [localX, localY] = localPoint(event)
    const [mapX, mapY] = view.toMap(localX, localY)

    // An event marker resolves to the player it belongs to, so clicking a kill
    // pulls up the journey that produced it.
    const marker = hits.eventAt(mapX, mapY, EVENT_GRAB * view.unitsPerPixel)
    if (marker) {
      setSelected(marker.p)
      return
    }

    const player = hits.playerAt(mapX, mapY, TRAIL_GRAB * view.unitsPerPixel)
    // Clicking bare ground clears, which is the obvious way out.
    setSelected(player)
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

          // Panning ends on the same pointerup as a click would. Only treat it
          // as a pick if the pointer barely moved.
          const press = pressRef.current
          pressRef.current = null
          if (!press) return
          const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y)
          if (moved <= CLICK_SLOP) pick(event)
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

      {hover && <MapTooltip target={hover} />}

      {selected !== null && data.players[selected] && (
        <SelectionChip player={data.players[selected]} onClear={() => setSelected(null)} />
      )}

      {ready && <Legend />}

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
