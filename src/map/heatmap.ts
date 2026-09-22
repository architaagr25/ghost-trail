import { MAP_SIZE } from './constants'

/**
 * Density grid resolution. At 256 each cell covers roughly three metres of
 * ground on the largest map, which is finer than the five second position
 * sampling can actually resolve -- there is nothing to gain from going higher.
 */
export const GRID = 256

/** Blur radius in cells. Three box passes approximate a Gaussian closely. */
const BLUR_RADIUS = 4
const BLUR_PASSES = 3

/**
 * Hotspots are long tailed: one heavily camped doorway can hold an order of
 * magnitude more samples than anywhere else, and scaling to the true maximum
 * would flatten the rest of the map to black. Normalising to a high percentile
 * keeps the ordinary range readable and lets the extreme simply clip.
 */
const NORMALISE_PERCENTILE = 0.99

/**
 * Sequential ramp, one hue, rising in lightness and opacity together.
 *
 * Transparent at the bottom so empty ground shows the minimap rather than a
 * wash of colour, and no second hue anywhere -- a rainbow ramp would invent
 * boundaries in what is a smooth quantity.
 */
const RAMP: Array<[number, number, number, number]> = [
  [0.0, 255, 122, 26],
  [0.35, 255, 122, 26],
  [0.65, 255, 163, 51],
  [1.0, 255, 219, 140],
]
const RAMP_ALPHA = [0, 0.38, 0.68, 0.92]

export interface DensityPoint {
  /** World coordinates; projection to grid space happens here. */
  x: number
  z: number
}

/**
 * Buckets points into a blurred density field over the map.
 *
 * A raw histogram of five-second position samples is a scatter of isolated
 * cells, not a surface. Blurring turns it into the continuous field a designer
 * reads as "this area is busy", and is what makes neighbouring routes merge
 * into a corridor rather than staying as separate specks.
 */
export function buildDensity(
  points: DensityPoint[],
  toGridX: (worldX: number) => number,
  toGridY: (worldZ: number) => number,
): Float32Array {
  const grid = new Float32Array(GRID * GRID)

  for (const point of points) {
    // Projection gives map units; the grid is a fixed subdivision of those.
    const gx = Math.floor((toGridX(point.x) / MAP_SIZE) * GRID)
    const gy = Math.floor((toGridY(point.z) / MAP_SIZE) * GRID)
    if (gx < 0 || gx >= GRID || gy < 0 || gy >= GRID) continue
    grid[gy * GRID + gx] += 1
  }

  return blur(grid)
}

/**
 * Separable box blur, repeated to approximate a Gaussian.
 *
 * Each pass runs horizontally into the scratch buffer and vertically back into
 * the grid, so the result always ends up in the array that was passed in.
 */
function blur(grid: Float32Array): Float32Array {
  const scratch = new Float32Array(GRID * GRID)

  for (let pass = 0; pass < BLUR_PASSES; pass += 1) {
    boxBlurAxis(grid, scratch, true)
    boxBlurAxis(scratch, grid, false)
  }

  return grid
}

function boxBlurAxis(source: Float32Array, target: Float32Array, horizontal: boolean): void {
  const width = 2 * BLUR_RADIUS + 1

  for (let line = 0; line < GRID; line += 1) {
    for (let i = 0; i < GRID; i += 1) {
      let total = 0
      for (let offset = -BLUR_RADIUS; offset <= BLUR_RADIUS; offset += 1) {
        // Clamp at the edges rather than wrapping, which would bleed one side
        // of the map into the other.
        const at = Math.min(GRID - 1, Math.max(0, i + offset))
        total += horizontal ? source[line * GRID + at] : source[at * GRID + line]
      }
      const index = horizontal ? line * GRID + i : i * GRID + line
      target[index] = total / width
    }
  }
}

/** Value to treat as the top of the ramp, ignoring the extreme tail. */
export function normalisingMax(grid: Float32Array): number {
  const occupied = Array.from(grid).filter((value) => value > 0)
  if (!occupied.length) return 1
  occupied.sort((a, b) => a - b)
  const index = Math.floor(occupied.length * NORMALISE_PERCENTILE)
  return Math.max(occupied[Math.min(index, occupied.length - 1)], 1e-6)
}

/** Paints a density grid into RGBA pixels using the sequential ramp. */
export function colorize(grid: Float32Array, max: number, intensity: number): ImageData {
  const pixels = new Uint8ClampedArray(GRID * GRID * 4)

  for (let i = 0; i < grid.length; i += 1) {
    const value = Math.min(1, (grid[i] / max) * intensity)
    if (value <= 0) continue

    const [r, g, b, a] = sample(value)
    const at = i * 4
    pixels[at] = r
    pixels[at + 1] = g
    pixels[at + 2] = b
    pixels[at + 3] = a * 255
  }

  return new ImageData(pixels, GRID, GRID)
}

function sample(value: number): [number, number, number, number] {
  for (let i = 1; i < RAMP.length; i += 1) {
    const [stop, r, g, b] = RAMP[i]
    const [previousStop, pr, pg, pb] = RAMP[i - 1]
    if (value > stop && i < RAMP.length - 1) continue

    const span = stop - previousStop || 1
    const t = Math.min(1, Math.max(0, (value - previousStop) / span))
    return [
      pr + (r - pr) * t,
      pg + (g - pg) * t,
      pb + (b - pb) * t,
      RAMP_ALPHA[i - 1] + (RAMP_ALPHA[i] - RAMP_ALPHA[i - 1]) * t,
    ]
  }
  const [, r, g, b] = RAMP[RAMP.length - 1]
  return [r, g, b, RAMP_ALPHA[RAMP_ALPHA.length - 1]]
}
