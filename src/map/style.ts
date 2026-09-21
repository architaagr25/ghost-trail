import type { EventCategory } from '../lib/types'

/**
 * Canvas colours, kept numeric for Pixi. They mirror the CSS custom properties
 * in `index.css`; when one side changes the other has to follow.
 */
export const COLORS = {
  human: 0x2ce8d5,
  bot: 0xf0a12e,
  kill: 0xff4d5e,
  death: 0xff2e6d,
  loot: 0xb46bff,
  storm: 0xff7a3d,
} as const

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

/** Marker radius in screen pixels, held constant as the viewport zooms. */
export const MARKER_RADIUS = 4.5
