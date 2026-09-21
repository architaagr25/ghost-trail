import { useEffect, useRef, useState } from 'react'
import { Application, Assets, Container, Sprite, Texture } from 'pixi.js'
import { Crosshair, Minus, Plus } from 'lucide-react'
import { MAP_SIZE } from './constants'
import { Viewport } from './viewport'

interface MapStageProps {
  /** URL of the minimap image for the active map. */
  image: string
  label: string
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
export function MapStage({ image, label }: MapStageProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<Viewport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

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

      const texture = await Assets.load<Texture>(image)
      if (cancelled) return

      const minimap = new Sprite(texture)
      // Draw the minimap into the fixed logical square so the rest of the app
      // never has to know the source image resolution.
      minimap.width = MAP_SIZE
      minimap.height = MAP_SIZE
      world.addChild(minimap)

      const viewport = new Viewport(world, {
        width: host.clientWidth,
        height: host.clientHeight,
      })
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
      app?.destroy(true, { children: true })
      app = null
    }
  }, [image])

  const viewport = () => viewportRef.current

  return (
    <div className="relative h-full w-full overflow-hidden bg-void">
      <div
        ref={hostRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          viewport()?.beginDrag(event.clientX, event.clientY)
        }}
        onPointerMove={(event) => viewport()?.drag(event.clientX, event.clientY)}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId)
          viewport()?.endDrag()
        }}
        onPointerLeave={() => viewport()?.endDrag()}
      />

      <div className="pointer-events-none absolute left-6 top-5 select-none">
        <p className="text-[10px] uppercase tracking-[0.25em] text-ink-faint">Map sector</p>
        <h2 className="text-xl font-medium tracking-wide text-ink">{label}</h2>
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

      {!ready && !error && (
        <p className="absolute inset-0 grid place-items-center text-xs uppercase tracking-[0.3em] text-ink-faint">
          Loading map
        </p>
      )}

      {error && (
        <p className="absolute inset-0 grid place-items-center px-8 text-center text-sm text-kill">
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
