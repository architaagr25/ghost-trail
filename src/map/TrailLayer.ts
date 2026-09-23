import { Container, Graphics } from 'pixi.js'
import type { PlayerTrail } from '../lib/types'
import { walkDashes } from './dash'
import type { Projection } from './projection'
import { COLORS } from './style'

/** A stroke weight, in screen pixels and opacity. */
interface Weight {
  width: number
  alpha: number
}

/**
 * The two ends of the emphasis ramp.
 *
 * One match is a couple of dozen journeys and carries full-weight strokes. A
 * whole map is hundreds, where that same weight overlaps into a solid mat with
 * no routes readable in it, so the crowded end is deliberately faint.
 */
const HUMAN_SPARSE: Weight = { width: 2.3, alpha: 0.92 }
const HUMAN_DENSE: Weight = { width: 1.5, alpha: 0.42 }
const BOT_SPARSE: Weight = { width: 1.8, alpha: 0.7 }
const BOT_DENSE: Weight = { width: 1.1, alpha: 0.3 }

/** Trail counts bracketing that ramp: one match against a whole map. */
const SPARSE_TRAILS = 24
const DENSE_TRAILS = 400

/**
 * Zoomed out, a journey covers a fraction of the pixels it does up close, so
 * the same stroke leaves far less ink to find it by. This lifts the weight at
 * fit zoom and eases it away once the view is this far in.
 */
const ZOOM_RELIEF = 4
const ZOOM_LIFT = 0.25

const BOT_DASH = 6
const BOT_GAP = 5

/**
 * Dashes are held at a constant screen size by dividing by the zoom factor.
 * Past this point that division is capped -- otherwise they keep shrinking in
 * map space and generate hundreds of thousands of segments for no visible gain.
 * Beyond the cap they simply grow on screen, which still reads as dashed.
 */
const MAX_DASH_ZOOM = 4

/** How far unselected trails fade back once a player is picked out. */
const UNSELECTED_FADE = 0.22
const SELECTED_WIDTH = 3.2
const SELECTED_ALPHA = 1

/** Radius of the dot marking where a player is at the current playhead. */
const HEAD_RADIUS = 3

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function blend(dense: Weight, sparse: Weight, t: number): Weight {
  return {
    width: dense.width + (sparse.width - dense.width) * t,
    alpha: dense.alpha + (sparse.alpha - dense.alpha) * t,
  }
}

/**
 * Draws player movement paths, keeping bots visually apart from humans.
 *
 * Humans are solid cyan on top, bots dashed amber underneath. Bots outnumber
 * humans in most matches, so pushing them down and back keeps the human routes
 * legible through the crowd. Colour, weight and line style all differ, so
 * neither colour blindness nor a dense overlap makes the two ambiguous.
 *
 * One Graphics per class rather than per player -- Pixi batches within an
 * object, so this is a handful of draw calls instead of hundreds.
 */
export class TrailLayer {
  readonly view = new Container()

  private readonly botGraphics = new Graphics()
  private readonly humanGraphics = new Graphics()
  private readonly selectedGraphics = new Graphics()
  private readonly headGraphics = new Graphics()
  private readonly projection: Projection
  private trails: PlayerTrail[] = []
  private selected: PlayerTrail | null = null
  private limit: number | null = null
  private zoom = 1
  private queued = false

  constructor(projection: Projection) {
    this.projection = projection
    // Order matters: bots, then humans, then whoever is selected on top.
    this.view.addChild(
      this.botGraphics,
      this.humanGraphics,
      this.selectedGraphics,
      this.headGraphics,
    )
  }

  /**
   * The selected trail, or null to clear. Held by identity because filtering
   * rebuilds the array and an index would then point at someone else.
   */
  setSelection(trail: PlayerTrail | null): void {
    if (trail === this.selected) return
    this.selected = trail
    this.schedule()
  }

  setVisible(visible: boolean): void {
    this.view.visible = visible
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
   * Reveal trails only up to this many seconds into the match, or null to draw
   * them whole. Playback has no meaning across several matches at once, so the
   * caller passes null there.
   */
  setTimeLimit(limit: number | null): void {
    if (limit === this.limit) return
    this.limit = limit
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
    this.humanGraphics.clear()
    this.botGraphics.clear()
    this.selectedGraphics.clear()
    this.headGraphics.clear()

    // Everything else recedes so the picked route stays readable.
    const fade = this.selected === null ? 1 : UNSELECTED_FADE

    const emphasis = this.emphasis()
    const human = blend(HUMAN_DENSE, HUMAN_SPARSE, emphasis)
    const bot = blend(BOT_DENSE, BOT_SPARSE, emphasis)

    for (const trail of this.trails) {
      if (trail.x.length < 2) continue
      if (trail === this.selected) continue
      if (trail.b) this.drawBot(trail, bot, fade)
      else this.drawHuman(trail, human, fade)
    }

    if (this.selected && this.selected.x.length > 1) this.drawSelected(this.selected)
    if (this.limit !== null) this.drawHeads()
  }

  /**
   * How boldly to draw, on a 0-1 scale from a crowded map to a single match.
   *
   * Count does most of the work: the faintness that keeps hundreds of
   * overlapping journeys readable leaves twenty of them nearly invisible. Zoom
   * adds a smaller lift on top, since the same trail is only a short scratch
   * once the whole map is on screen.
   */
  private emphasis(): number {
    const crowd = (this.trails.length - SPARSE_TRAILS) / (DENSE_TRAILS - SPARSE_TRAILS)
    const out = (this.zoom - 1) / (ZOOM_RELIEF - 1)
    return clamp01(1 - clamp01(crowd) + (1 - clamp01(out)) * ZOOM_LIFT)
  }

  /**
   * Number of points revealed at the current playhead. Samples are in time
   * order, and a typical journey is only about 60 points, so a linear scan
   * beats the bookkeeping a binary search would need.
   */
  private revealed(trail: PlayerTrail): number {
    if (this.limit === null) return trail.x.length
    let count = 0
    while (count < trail.t.length && trail.t[count] <= this.limit) count += 1
    return count
  }

  /**
   * A dot at each player's latest known position. A path growing from its far
   * end is hard to follow; the dot says where everyone is right now.
   */
  private drawHeads(): void {
    const g = this.headGraphics
    const radius = HEAD_RADIUS / this.zoom

    for (const colour of [COLORS.bot, COLORS.human]) {
      let drew = false
      for (const trail of this.trails) {
        if ((trail.b ? COLORS.bot : COLORS.human) !== colour) continue
        const count = this.revealed(trail)
        if (count === 0) continue

        const last = count - 1
        g.circle(this.projection.x(trail.x[last]), this.projection.y(trail.z[last]), radius)
        drew = true
      }
      if (drew) {
        g.fill({ color: colour, alpha: 0.95 })
        g.stroke({ width: 1 / this.zoom, color: 0x05090c, alpha: 0.8 })
      }
    }
  }

  private drawSelected(trail: PlayerTrail): void {
    const g = this.selectedGraphics
    this.tracePath(g, trail)
    g.stroke({
      width: SELECTED_WIDTH / this.zoom,
      color: trail.b ? COLORS.bot : COLORS.human,
      alpha: SELECTED_ALPHA,
      cap: 'round',
      join: 'round',
    })
  }

  /** Lays down a trail's path, lifting the pen across recording gaps. */
  private tracePath(g: Graphics, trail: PlayerTrail): void {
    const { x, z } = trail
    const breaks = new Set(trail.breaks)
    const count = this.revealed(trail)
    if (count < 2) return

    g.moveTo(this.projection.x(x[0]), this.projection.y(z[0]))
    for (let i = 1; i < count; i += 1) {
      const px = this.projection.x(x[i])
      const py = this.projection.y(z[i])
      // Do not invent a path through terrain the player may never have crossed.
      if (breaks.has(i)) g.moveTo(px, py)
      else g.lineTo(px, py)
    }
  }

  private drawHuman(trail: PlayerTrail, weight: Weight, fade: number): void {
    const g = this.humanGraphics
    this.tracePath(g, trail)
    g.stroke({
      width: weight.width / this.zoom,
      color: COLORS.human,
      alpha: weight.alpha * fade,
      cap: 'round',
      join: 'round',
    })
  }

  private drawBot(trail: PlayerTrail, weight: Weight, fade: number): void {
    const g = this.botGraphics

    // Dashes are measured in screen pixels, so the pattern is divided by the
    // zoom factor along with the stroke width -- up to the cap.
    const dashZoom = Math.min(this.zoom, MAX_DASH_ZOOM)
    for (const run of this.segments(trail)) {
      if (run.length < 2) continue
      walkDashes(run, BOT_DASH / dashZoom, BOT_GAP / dashZoom, (x1, y1, x2, y2) => {
        g.moveTo(x1, y1)
        g.lineTo(x2, y2)
      })
    }

    g.stroke({
      width: weight.width / this.zoom,
      color: COLORS.bot,
      alpha: weight.alpha * fade,
      cap: 'butt',
    })
  }

  /** Splits a trail into the runs between recording gaps, in map space. */
  private segments(trail: PlayerTrail): Array<Array<[number, number]>> {
    const count = this.revealed(trail)
    const bounds = [0, ...trail.breaks.filter((index) => index < count), count]
    const runs: Array<Array<[number, number]>> = []

    for (let b = 1; b < bounds.length; b += 1) {
      const run: Array<[number, number]> = []
      for (let i = bounds[b - 1]; i < bounds[b]; i += 1) {
        run.push([this.projection.x(trail.x[i]), this.projection.y(trail.z[i])])
      }
      if (run.length > 1) runs.push(run)
    }
    return runs
  }

  destroy(): void {
    this.view.destroy({ children: true })
  }
}
