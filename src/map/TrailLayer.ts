import { Container, Graphics } from 'pixi.js'
import type { PlayerTrail } from '../lib/types'
import { walkDashes } from './dash'
import type { Projection } from './projection'
import { COLORS } from './style'

/** Widths and opacities in screen pixels, held steady as the viewport zooms. */
const HUMAN_WIDTH = 1.3
const HUMAN_ALPHA = 0.34
const BOT_WIDTH = 1
const BOT_ALPHA = 0.26
const BOT_DASH = 6
const BOT_GAP = 5

/**
 * Dash length is normally held constant on screen, which means dividing by the
 * zoom factor. Past this zoom that division is capped: the dashes would keep
 * shrinking in map space while the full set of trails is still being drawn,
 * generating hundreds of thousands of tiny segments for no visible gain.
 * Beyond the cap dashes simply grow on screen, which still reads as dashed.
 */
const MAX_DASH_ZOOM = 4

/** How far unselected trails fade back once a player is picked out. */
const UNSELECTED_FADE = 0.22
const SELECTED_WIDTH = 2.4
const SELECTED_ALPHA = 1

/**
 * Draws player movement paths, with bots visually separated from humans.
 *
 * Humans are solid cyan and sit on top; bots are a dashed, dimmer amber
 * underneath. Bots outnumber humans in most matches, so drawing them beneath
 * and at lower contrast keeps the human routes -- the ones a designer is
 * usually reading -- legible through the crowd. The two differ in colour,
 * weight and line style, so neither colour blindness nor a dense overlap makes
 * them ambiguous.
 *
 * Humans and bots get one Graphics each rather than one per player: Pixi
 * batches within an object, so this is a handful of draw calls instead of
 * hundreds.
 */
export class TrailLayer {
  readonly view = new Container()

  private readonly botGraphics = new Graphics()
  private readonly humanGraphics = new Graphics()
  private readonly selectedGraphics = new Graphics()
  private readonly projection: Projection
  private trails: PlayerTrail[] = []
  private selected: PlayerTrail | null = null
  private zoom = 1
  private queued = false

  constructor(projection: Projection) {
    this.projection = projection
    // Order matters: bots, then humans, then whoever is selected on top.
    this.view.addChild(this.botGraphics, this.humanGraphics, this.selectedGraphics)
  }

  /**
   * The selected trail, by identity, or null to clear.
   *
   * Identity rather than an index, because filtering rebuilds the array and an
   * index would then point at a different player.
   */
  setSelection(trail: PlayerTrail | null): void {
    if (trail === this.selected) return
    this.selected = trail
    this.schedule()
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
    this.humanGraphics.clear()
    this.botGraphics.clear()
    this.selectedGraphics.clear()

    // Everything else recedes while one player is picked out, so the selected
    // route stays readable through the crowd it is drawn over.
    const fade = this.selected === null ? 1 : UNSELECTED_FADE

    for (const trail of this.trails) {
      if (trail.x.length < 2) continue
      if (trail === this.selected) continue
      if (trail.b) this.drawBot(trail, fade)
      else this.drawHuman(trail, fade)
    }

    if (this.selected && this.selected.x.length > 1) this.drawSelected(this.selected)
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

    g.moveTo(this.projection.x(x[0]), this.projection.y(z[0]))
    for (let i = 1; i < x.length; i += 1) {
      const px = this.projection.x(x[i])
      const py = this.projection.y(z[i])
      // Do not invent a path through terrain the player may never have crossed.
      if (breaks.has(i)) g.moveTo(px, py)
      else g.lineTo(px, py)
    }
  }

  private drawHuman(trail: PlayerTrail, fade: number): void {
    const g = this.humanGraphics
    this.tracePath(g, trail)
    g.stroke({
      width: HUMAN_WIDTH / this.zoom,
      color: COLORS.human,
      alpha: HUMAN_ALPHA * fade,
      cap: 'round',
      join: 'round',
    })
  }

  private drawBot(trail: PlayerTrail, fade: number): void {
    const g = this.botGraphics

    // Dashes are measured in screen pixels, so the pattern is divided by the
    // zoom factor along with the stroke width -- up to the cap.
    const dashZoom = Math.min(this.zoom, MAX_DASH_ZOOM)
    for (const run of this.segments(trail)) {
      walkDashes(run, BOT_DASH / dashZoom, BOT_GAP / dashZoom, (x1, y1, x2, y2) => {
        g.moveTo(x1, y1)
        g.lineTo(x2, y2)
      })
    }

    g.stroke({
      width: BOT_WIDTH / this.zoom,
      color: COLORS.bot,
      alpha: BOT_ALPHA * fade,
      cap: 'butt',
    })
  }

  /** Splits a trail into the runs between recording gaps, in map space. */
  private segments(trail: PlayerTrail): Array<Array<[number, number]>> {
    const bounds = [0, ...trail.breaks, trail.x.length]
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
