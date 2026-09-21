import type { GameEvent, PlayerTrail } from '../lib/types'
import { MAP_SIZE } from './constants'
import type { Projection } from './projection'

/**
 * Cell size in map units. Small enough that a lookup only scans a handful of
 * candidates, large enough that the grid stays cheap to build.
 */
const CELL = 16

interface EventHit {
  event: GameEvent
  index: number
}

interface Cell {
  events: EventHit[]
  /** Indices into the player array, for trails passing through this cell. */
  players: Set<number>
}

/**
 * A uniform grid over map space for pointer hit testing.
 *
 * A busy map carries 61,000 trail points and 12,000 events. Scanning all of
 * them on every pointer move would stall the UI, so both are bucketed once and
 * a lookup only examines the cells within the hit radius.
 *
 * Everything is stored in map units rather than screen pixels, so the index
 * survives panning and zooming untouched.
 */
export class HitIndex {
  private readonly cells = new Map<number, Cell>()
  private readonly eventPoints: Array<[number, number]> = []
  private readonly playerPoints: Array<Array<[number, number]>> = []

  constructor(projection: Projection, players: PlayerTrail[], events: GameEvent[]) {
    players.forEach((trail, playerIndex) => {
      const points: Array<[number, number]> = []
      for (let i = 0; i < trail.x.length; i += 1) {
        const point: [number, number] = [
          projection.x(trail.x[i]),
          projection.y(trail.z[i]),
        ]
        points.push(point)
        this.cell(point[0], point[1]).players.add(playerIndex)
      }
      this.playerPoints.push(points)
    })

    events.forEach((event, index) => {
      const point: [number, number] = [projection.x(event.x), projection.y(event.z)]
      this.eventPoints.push(point)
      this.cell(point[0], point[1]).events.push({ event, index })
    })
  }

  /**
   * Nearest event within `radius`, or null.
   *
   * Events win over trails when both are under the pointer: a marker is a
   * deliberate target, a trail is ambient.
   */
  eventAt(x: number, y: number, radius: number): GameEvent | null {
    let best: GameEvent | null = null
    let bestDistance = radius * radius

    for (const cell of this.near(x, y, radius)) {
      for (const hit of cell.events) {
        const [ex, ey] = this.eventPoints[hit.index]
        const distance = (ex - x) ** 2 + (ey - y) ** 2
        if (distance < bestDistance) {
          bestDistance = distance
          best = hit.event
        }
      }
    }
    return best
  }

  /** Index of the player whose trail passes nearest the point, or null. */
  playerAt(x: number, y: number, radius: number): number | null {
    let best: number | null = null
    let bestDistance = radius * radius

    for (const cell of this.near(x, y, radius)) {
      for (const playerIndex of cell.players) {
        for (const [px, py] of this.playerPoints[playerIndex]) {
          const distance = (px - x) ** 2 + (py - y) ** 2
          if (distance < bestDistance) {
            bestDistance = distance
            best = playerIndex
          }
        }
      }
    }
    return best
  }

  private *near(x: number, y: number, radius: number): Generator<Cell> {
    const minX = Math.floor((x - radius) / CELL)
    const maxX = Math.floor((x + radius) / CELL)
    const minY = Math.floor((y - radius) / CELL)
    const maxY = Math.floor((y + radius) / CELL)

    for (let cx = minX; cx <= maxX; cx += 1) {
      for (let cy = minY; cy <= maxY; cy += 1) {
        const cell = this.cells.get(key(cx, cy))
        if (cell) yield cell
      }
    }
  }

  private cell(x: number, y: number): Cell {
    const id = key(Math.floor(x / CELL), Math.floor(y / CELL))
    let cell = this.cells.get(id)
    if (!cell) {
      cell = { events: [], players: new Set() }
      this.cells.set(id, cell)
    }
    return cell
  }
}

const COLUMNS = Math.ceil(MAP_SIZE / CELL) + 2

function key(cx: number, cy: number): number {
  return cy * COLUMNS + cx
}
