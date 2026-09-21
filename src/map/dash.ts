/**
 * Walks a polyline emitting alternating on/off runs, so a path can be stroked
 * as a dashed line.
 *
 * Pixi has no dash support, and bot trails need to read as distinct from human
 * ones at a glance even where the two overlap -- colour alone gets lost in a
 * pile-up. The callback receives each dash as a pair of endpoints.
 */
export function walkDashes(
  points: ReadonlyArray<readonly [number, number]>,
  dash: number,
  gap: number,
  emit: (x1: number, y1: number, x2: number, y2: number) => void,
): void {
  if (points.length < 2) return

  let penDown = true
  // How much of the current dash or gap is still owed, carried across segment
  // boundaries so the pattern stays continuous around corners.
  let remaining = dash

  for (let i = 1; i < points.length; i += 1) {
    const [startX, startY] = points[i - 1]
    const [endX, endY] = points[i]

    const total = Math.hypot(endX - startX, endY - startY)
    if (total === 0) continue

    const ux = (endX - startX) / total
    const uy = (endY - startY) / total

    let travelled = 0
    while (total - travelled > remaining) {
      const fromX = startX + ux * travelled
      const fromY = startY + uy * travelled
      travelled += remaining
      if (penDown) {
        emit(fromX, fromY, startX + ux * travelled, startY + uy * travelled)
      }
      penDown = !penDown
      remaining = penDown ? dash : gap
    }

    if (penDown) {
      emit(startX + ux * travelled, startY + uy * travelled, endX, endY)
    }
    remaining -= total - travelled
  }
}
