import { Container, Graphics } from 'pixi.js'
import type { PlayerTrail } from '../lib/types'
import type { Projection } from './projection'

/** Stroke width in screen pixels, held constant as the viewport zooms. */
const TRAIL_WIDTH = 1.4
const TRAIL_ALPHA = 0.55
const TRAIL_COLOR = 0x2ce8d5

/**
 * Draws player movement paths.
 *
 * Every trail goes into a single Graphics object. Pixi batches one object's
 * strokes into very few draw calls, where a Graphics per player would mean
 * hundreds of them and a visible stall on the busier maps.
 *
 * Stroke width is divided by the zoom factor so lines keep the same thickness
 * on screen at every zoom level. Without that, paths turn into thick slabs when
 * you zoom into a building and the detail you zoomed in for disappears.
 */
export class TrailLayer {
  readonly view = new Container()

  private readonly graphics = new Graphics()
  private readonly projection: Projection
  private trails: PlayerTrail[] = []
  private zoom = 1
  private queued = false

  constructor(projection: Projection) {
    this.projection = projection
    this.view.addChild(this.graphics)
  }

  setTrails(trails: PlayerTrail[]): void {
    this.trails = trails
    this.schedule()
  }

  setZoom(zoom: number): void {
    if (zoom === this.zoom) return
    this.zoom = zoom
    this.schedule()
  }

  /**
   * Coalesce redraws into the next frame. A wheel gesture fires many zoom
   * events in quick succession and each one would otherwise redraw every path.
   */
  private schedule(): void {
    if (this.queued) return
    this.queued = true
    requestAnimationFrame(() => {
      this.queued = false
      this.draw()
    })
  }

  private draw(): void {
    const g = this.graphics
    g.clear()

    for (const trail of this.trails) {
      const { x, z } = trail
      if (x.length < 2) continue

      g.moveTo(this.projection.x(x[0]), this.projection.y(z[0]))
      for (let i = 1; i < x.length; i += 1) {
        g.lineTo(this.projection.x(x[i]), this.projection.y(z[i]))
      }
      g.stroke({
        width: TRAIL_WIDTH / this.zoom,
        color: TRAIL_COLOR,
        alpha: TRAIL_ALPHA,
        cap: 'round',
        join: 'round',
      })
    }
  }

  destroy(): void {
    this.view.destroy({ children: true })
  }
}
