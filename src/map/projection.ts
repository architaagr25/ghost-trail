import type { MapProjection } from '../lib/types'
import { MAP_SIZE } from './constants'

/**
 * Converts world coordinates into the map's drawing square.
 *
 * Each map ships a `scale` and origin bounding the playable area. Normalising
 * against them gives a 0-1 pair that scales to the square, with V flipped on
 * the way out because image Y grows downward while world Z grows north.
 *
 * Only x and z take part -- y is elevation and means nothing on a top-down map.
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
