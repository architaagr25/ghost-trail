import { useState } from 'react'
import type { SurvivalPoint } from '../lib/stats'
import { formatClock } from '../lib/format'
import { COLORS, cssColor } from '../map/style'

const WIDTH = 240
const HEIGHT = 56
const PAD_TOP = 6
const PAD_BOTTOM = 12

/**
 * Players still alive across a match.
 *
 * A step line, because the quantity is a step: it holds flat and drops by one
 * the instant someone dies. Interpolating would draw a smooth decline that
 * never happened.
 *
 * One series, so no legend -- the heading names it -- and only the ends are
 * labelled. The playhead is drawn over the top so the curve reads against
 * wherever playback has reached.
 */
export function SurvivalChart({
  points,
  duration,
  time,
}: {
  points: SurvivalPoint[]
  duration: number
  time: number
}) {
  const [hover, setHover] = useState<SurvivalPoint | null>(null)

  if (points.length < 2) return null

  const start = points[0].alive
  const end = points[points.length - 1].alive
  const span = Math.max(duration, 1)
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM

  const toX = (t: number) => (Math.min(t, span) / span) * WIDTH
  // Zero sits on the baseline, so a wipeout reads as the line hitting the floor.
  const toY = (alive: number) => PAD_TOP + plotHeight - (alive / Math.max(start, 1)) * plotHeight

  let path = `M ${toX(points[0].t)} ${toY(points[0].alive)}`
  for (let i = 1; i < points.length; i += 1) {
    path += ` L ${toX(points[i].t)} ${toY(points[i - 1].alive)}`
    path += ` L ${toX(points[i].t)} ${toY(points[i].alive)}`
  }

  function onMove(event: React.MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const t = ((event.clientX - rect.left) / rect.width) * span
    // The step holding at this moment is the last one at or before it.
    let found = points[0]
    for (const point of points) {
      if (point.t <= t) found = point
      else break
    }
    setHover({ t, alive: found.alive })
  }

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <p className="label text-ink-faint">Players remaining</p>
        <p className="numeric text-xs text-ink">
          {hover ? hover.alive : end} <span className="text-ink-faint">/ {start}</span>
        </p>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Players remaining over the match, from ${start} down to ${end}`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* Recessive baseline, so the curve carries the reading. */}
        <line
          x1="0"
          y1={PAD_TOP + plotHeight}
          x2={WIDTH}
          y2={PAD_TOP + plotHeight}
          stroke="currentColor"
          className="text-edge-bright"
          strokeWidth="1"
        />

        <path
          d={path}
          fill="none"
          stroke={cssColor(COLORS.human)}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Where playback has reached. */}
        <line
          x1={toX(time)}
          y1={PAD_TOP}
          x2={toX(time)}
          y2={PAD_TOP + plotHeight}
          stroke={cssColor(COLORS.storm)}
          strokeWidth="1"
          strokeDasharray="2 2"
        />

        {hover && (
          <line
            x1={toX(hover.t)}
            y1={PAD_TOP}
            x2={toX(hover.t)}
            y2={PAD_TOP + plotHeight}
            stroke="currentColor"
            className="text-ink-faint"
            strokeWidth="1"
          />
        )}

        <text x="0" y={HEIGHT - 2} className="fill-ink-faint text-[9px]">
          0:00
        </text>
        <text x={WIDTH} y={HEIGHT - 2} textAnchor="end" className="fill-ink-faint text-[9px]">
          {formatClock(hover ? hover.t : span)}
        </text>
      </svg>
    </div>
  )
}
