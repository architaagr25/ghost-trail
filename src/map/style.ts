import type { EventCategory } from '../lib/types'

/**
 * Canvas colours, kept numeric for Pixi. They mirror the CSS custom properties
 * in `index.css`; when one side changes the other has to follow.
 */
export const COLORS = {
  human: 0x2ce8d5,
  bot: 0xf0a12e,
  // Kill and death are the pair most often read against each other, so they sit
  // at opposite ends of the range rather than as two neighbouring reds. Storm
  // moves to yellow for the same reason: it was close enough to the kill red to
  // be mistaken for it.
  kill: 0xff2f45,
  death: 0xeef6ff,
  loot: 0xb46bff,
  storm: 0xffd60a,
} as const

/**
 * Markers carry a dark outline. Trails are bright and dense enough that an
 * unoutlined marker disappears into them wherever routes converge -- which is
 * exactly where the events are.
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
 * The legend and panels read their colours from this table rather than from the
 * CSS custom properties. Tailwind only emits theme tokens it can see referenced
 * literally in the source, so a name built at runtime silently resolves to
 * nothing -- and one table feeding both canvas and DOM cannot drift anyway.
 */
export function cssColor(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`
}

/** Marker radius in screen pixels, held constant as the viewport zooms. */
export const MARKER_RADIUS = 5
