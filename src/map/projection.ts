import type { MapProjection } from '../lib/types'
import { MAP_SIZE } from './constants'

/**
 * Converts world coordinates into the map's logical drawing square.
 *
 * Each map ships a `scale` and an origin that together bound the playable area.
 * Normalising against them gives a 0-1 UV pair, which scales to the drawing
 * square. V is flipped on the way out because world Z grows northward while
 * image Y grows downward from a top-left origin.
 *
 * Only `x` and `z` take part. The `y` column in the telemetry is elevation and
 * has no meaning on a top-down map.
 */
export class Projection {
  private readonly scale: number
  private readonly originX: number
  private readonly originZ: number

  constructor(config: MapProjection) {
    this.scale = config.scale
    this.originX = config.originX
    this.originZ = config.originZ
  }

  x(worldX: number): number {
    return ((worldX - this.originX) / this.scale) * MAP_SIZE
  }

  y(worldZ: number): number {
    return (1 - (worldZ - this.originZ) / this.scale) * MAP_SIZE
  }
}
