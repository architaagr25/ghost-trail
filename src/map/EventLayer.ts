import { Container, Graphics } from 'pixi.js'
import type { EventCategory, GameEvent } from '../lib/types'
import type { Projection } from './projection'
import { EVENT_COLOR, MARKER_OUTLINE, MARKER_RADIUS } from './style'

/** Painted back to front, so rarer and more urgent events land on top. */
const DRAW_ORDER: EventCategory[] = ['loot', 'death', 'kill', 'storm']

/**
 * Draws kills, deaths, loot pickups and storm deaths.
 *
 * Every category has its own shape as well as its own colour, so the markers
 * stay readable where several land on one building and for a colour blind
 * reader. Sizes are in screen pixels and redrawn on zoom -- scaling with the
 * map would leave them invisible zoomed out and covering a compound zoomed in.
 */
export class EventLayer {
  readonly view = new Container()

  private readonly graphics = new Graphics()
  private readonly projection: Projection
  private events: GameEvent[] = []
  private limit: number | null = null
  private zoom = 1
  private queued = false

  constructor(projection: Projection) {
    this.projection = projection
    this.view.addChild(this.graphics)
  }

  setEvents(events: GameEvent[]): void {
    this.events = events
    this.schedule()
  }

  setZoom(zoom: number): void {
    if (zoom === this.zoom) return
    this.zoom = zoom
    this.schedule()
  }

  /** Show only events up to this point in the match, or null for all of them. */
  setTimeLimit(limit: number | null): void {
    if (limit === this.limit) return
    this.limit = limit
    this.schedule()
  }

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

    const radius = MARKER_RADIUS / this.zoom
    const byCategory = new Map<EventCategory, GameEvent[]>()
    for (const event of this.events) {
      if (this.limit !== null && event.t > this.limit) continue
      const bucket = byCategory.get(event.c)
      if (bucket) bucket.push(event)
      else byCategory.set(event.c, [event])
    }

    // One pass per category, so each shape batch takes a single fill call.
    for (const category of DRAW_ORDER) {
      const bucket = byCategory.get(category)
      if (!bucket?.length) continue

      for (const event of bucket) {
        const x = this.projection.x(event.x)
        const y = this.projection.y(event.z)
        drawMarker(g, category, x, y, radius)
      }

      // Fill, then outline to lift the marker off the trails beneath it.
      g.fill({ color: EVENT_COLOR[category], alpha: 0.95 })
      g.stroke({ width: 1.1 / this.zoom, color: MARKER_OUTLINE, alpha: 0.85 })
    }
  }

  destroy(): void {
    this.view.destroy({ children: true })
  }
}

/** A distinct silhouette per category, all drawn around a common radius. */
function drawMarker(
  g: Graphics,
  category: EventCategory,
  x: number,
  y: number,
  r: number,
): void {
  switch (category) {
    // A four-pointed burst -- the strongest shape, for the rarest event.
    case 'kill': {
      const thin = r * 0.3
      g.poly([x, y - r, x + thin, y - thin, x + r, y, x + thin, y + thin, x, y + r, x - thin, y + thin, x - r, y, x - thin, y - thin])
      return
    }
    // A cross -- the opposite silhouette to the kill burst, arms on the
    // diagonals rather than the axes.
    case 'death': {
      const arm = r * 0.95
      const half = r * 0.3
      for (const [dx, dy] of [
        [1, 1],
        [1, -1],
      ] as const) {
        // Two crossed bars, each a quad along one diagonal.
        g.poly([
          x - arm * dx - half * dy, y - arm * dy + half * dx,
          x - arm * dx + half * dy, y - arm * dy - half * dx,
          x + arm * dx + half * dy, y + arm * dy - half * dx,
          x + arm * dx - half * dy, y + arm * dy + half * dx,
        ])
      }
      return
    }
    // A diamond: quieter, and there are far more of these than anything else.
    case 'loot':
      g.poly([x, y - r * 0.85, x + r * 0.85, y, x, y + r * 0.85, x - r * 0.85, y])
      return
    // A triangle, pointing at the hazard that caused it.
    case 'storm':
      g.poly([x, y - r, x + r * 0.9, y + r * 0.7, x - r * 0.9, y + r * 0.7])
      return
  }
}
