import type { EventCategory } from '../lib/types'

/**
 * Trail and event colours, numeric for Pixi. This is where they live -- the DOM
 * side reads them back through `cssColor` rather than from CSS.
 */
export const COLORS = {
  human: 0x2ce8d5,
  bot: 0xf0a12e,
  // Kill and death get read against each other constantly, so they sit at
  // opposite ends rather than as two neighbouring reds. Storm is yellow for the
  // same reason: as orange it was too easy to mistake for a kill.
  kill: 0xff2f45,
  death: 0xeef6ff,
  loot: 0xb46bff,
  storm: 0xffd60a,
} as const

/**
 * Markers need a dark outline: trails are bright enough to swallow one wherever
 * routes converge, which is exactly where the events are.
 */
export const MARKER_OUTLINE = 0x05090c

export const EVENT_COLOR: Record<EventCategory, number> = {
  kill: COLORS.kill,
  death: COLORS.death,
  loot: COLORS.loot,
  storm: COLORS.storm,
}

export const EVENT_LABEL: Record<EventCategory, string> = {
  kill: 'Kill',
  death: 'Death',
  loot: 'Loot pickup',
  storm: 'Storm death',
}

/**
 * Hex string for a Pixi colour, for the DOM side of the UI.
 *
 * Tailwind only emits theme tokens it sees written out literally, so a class
 * name assembled at runtime resolves to nothing. Reading this table instead
 * keeps the legend and the canvas on one set of colours.
 */
export function cssColor(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`
}

/** Marker radius in screen pixels, held constant as the viewport zooms. */
export const MARKER_RADIUS = 5
