/**
 * Walks a polyline, handing each dash to the callback as a pair of endpoints.
 *
 * Pixi has no dashed strokes, and bot trails have to stay distinct from human
 * ones where the two overlap -- colour alone gets lost in a pile-up.
 */
export function walkDashes(
  points: ReadonlyArray<readonly [number, number]>,
  dash: number,
  gap: number,
  emit: (x1: number, y1: number, x2: number, y2: number) => void,
): void {
  if (points.length < 2) return

  let penDown = true
  // Carried across segment boundaries so the pattern survives corners.
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
