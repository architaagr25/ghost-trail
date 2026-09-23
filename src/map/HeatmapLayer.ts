import { Container, Sprite, Texture } from 'pixi.js'
import { MAP_SIZE } from './constants'
import { buildDensity, colorize, normalisingMax, type DensityPoint } from './heatmap'
import type { Projection } from './projection'

/**
 * Renders a density field over the minimap.
 *
 * The field is computed on a small grid, painted offscreen and uploaded as one
 * texture, so a busy map still costs a single draw call where a blob per sample
 * would mean tens of thousands of overlapping shapes.
 *
 * The GPU stretching that 256px texture is what gives the field its smooth
 * falloff, so the blur is deliberate rather than something to correct for.
 */
export class HeatmapLayer {
  readonly view = new Container()

  private readonly canvas = document.createElement('canvas')
  private readonly context: CanvasRenderingContext2D
  private readonly projection: Projection
  private sprite: Sprite | null = null
  private points: DensityPoint[] = []
  private intensity = 1
  private queued = false

  constructor(projection: Projection) {
    this.projection = projection
    this.canvas.width = this.canvas.height = 256

    const context = this.canvas.getContext('2d')
    if (!context) throw new Error('Could not create the heatmap drawing surface.')
    this.context = context

    // Sits above the minimap but below trails and markers, so it reads as
    // terrain shading rather than covering the events it explains.
    this.view.zIndex = 0
  }

  setPoints(points: DensityPoint[]): void {
    this.points = points
    this.schedule()
  }

  setIntensity(intensity: number): void {
    if (intensity === this.intensity) return
    this.intensity = intensity
    this.schedule()
  }

  setVisible(visible: boolean): void {
    this.view.visible = visible
    if (visible) this.schedule()
  }

  /** Coalesce rebuilds into the next frame; filters can change in bursts. */
  private schedule(): void {
    if (this.queued || !this.view.visible) return
    this.queued = true
    requestAnimationFrame(() => {
      this.queued = false
      this.draw()
    })
  }

  private draw(): void {
    if (!this.points.length) {
      this.sprite?.destroy()
      this.sprite = null
      this.view.removeChildren()
      return
    }

    const grid = buildDensity(
      this.points,
      (worldX) => this.projection.x(worldX),
      (worldZ) => this.projection.y(worldZ),
    )
    const image = colorize(grid, normalisingMax(grid), this.intensity)
    this.context.putImageData(image, 0, 0)

    // Replaced rather than updated in place: Pixi caches uploaded texture
    // data, and a fresh source is the reliable way to invalidate it.
    this.sprite?.destroy()
    this.view.removeChildren()

    const sprite = new Sprite(Texture.from(this.canvas, true))
    sprite.width = MAP_SIZE
    sprite.height = MAP_SIZE
    this.sprite = sprite
    this.view.addChild(sprite)
  }

  destroy(): void {
    this.view.destroy({ children: true })
  }
}
