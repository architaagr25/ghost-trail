import type { Container } from 'pixi.js'
import { MAP_SIZE, MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from './constants'

interface Size {
  width: number
  height: number
}

/**
 * Pan and zoom for the map container.
 *
 * Zoom is tracked as a multiple of the fit-to-viewport scale rather than as an
 * absolute value, so a given zoom level frames the same amount of map whatever
 * size the window is. Panning is clamped so the map cannot be dragged off
 * screen and lost.
 */
export class Viewport {
  private zoom = MIN_ZOOM
  private panX = 0
  private panY = 0
  private dragging = false
  private lastX = 0
  private lastY = 0

  private readonly world: Container
  private size: Size

  constructor(world: Container, size: Size) {
    this.world = world
    this.size = size
  }

  /** Scale at which the whole map just fits inside the shorter viewport axis. */
  private get fitScale(): number {
    return Math.min(this.size.width, this.size.height) / MAP_SIZE
  }

  private get scale(): number {
    return this.fitScale * this.zoom
  }

  resize(size: Size): void {
    this.size = size
    this.apply()
  }

  reset(): void {
    this.zoom = MIN_ZOOM
    this.panX = 0
    this.panY = 0
    this.apply()
  }

  /**
   * Zoom by `factor`, keeping the point under (`focusX`, `focusY`) in screen
   * space pinned. Without that the map slides away from the cursor as you
   * scroll, which makes it hard to zoom in on a specific building.
   */
  zoomBy(factor: number, focusX: number, focusY: number): void {
    const next = clamp(this.zoom * factor, MIN_ZOOM, MAX_ZOOM)
    if (next === this.zoom) return

    const before = this.scale
    const worldX = (focusX - this.originX) / before
    const worldY = (focusY - this.originY) / before

    this.zoom = next
    const after = this.scale

    this.panX += focusX - (this.centreX + worldX * after)
    this.panY += focusY - (this.centreY + worldY * after)
    this.apply()
  }

  zoomIn(): void {
    this.zoomBy(ZOOM_STEP, this.size.width / 2, this.size.height / 2)
  }

  zoomOut(): void {
    this.zoomBy(1 / ZOOM_STEP, this.size.width / 2, this.size.height / 2)
  }

  beginDrag(x: number, y: number): void {
    this.dragging = true
    this.lastX = x
    this.lastY = y
  }

  drag(x: number, y: number): void {
    if (!this.dragging) return
    this.panX += x - this.lastX
    this.panY += y - this.lastY
    this.lastX = x
    this.lastY = y
    this.apply()
  }

  endDrag(): void {
    this.dragging = false
  }

  get isDragging(): boolean {
    return this.dragging
  }

  /** Screen position of the map's top-left corner before panning. */
  private get centreX(): number {
    return (this.size.width - MAP_SIZE * this.scale) / 2
  }

  private get centreY(): number {
    return (this.size.height - MAP_SIZE * this.scale) / 2
  }

  private get originX(): number {
    return this.centreX + this.panX
  }

  private get originY(): number {
    return this.centreY + this.panY
  }

  private apply(): void {
    this.clampPan()
    this.world.scale.set(this.scale)
    this.world.position.set(this.originX, this.originY)
  }

  /**
   * Keep at least the map edge within the viewport. When the map is smaller
   * than the viewport on an axis it stays centred on that axis instead.
   */
  private clampPan(): void {
    const drawn = MAP_SIZE * this.scale
    const slackX = Math.max(0, drawn - this.size.width)
    const slackY = Math.max(0, drawn - this.size.height)
    this.panX = clamp(this.panX, -slackX / 2, slackX / 2)
    this.panY = clamp(this.panY, -slackY / 2, slackY / 2)
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
