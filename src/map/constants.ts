/**
 * The map is drawn in a fixed square of world-independent units. Every layer
 * positions itself in this space and the viewport scales the whole thing, so
 * nothing downstream has to care what resolution the minimap image is.
 */
export const MAP_SIZE = 1024

/** Zoom bounds, expressed as multiples of the fit-to-viewport scale. */
export const MIN_ZOOM = 1
export const MAX_ZOOM = 16

export const ZOOM_STEP = 1.35
