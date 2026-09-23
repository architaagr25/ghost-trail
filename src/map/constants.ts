/**
 * Everything is drawn in a fixed square of map units and scaled by the
 * viewport, so no layer has to know the minimap image's resolution.
 */
export const MAP_SIZE = 1024

/** Zoom bounds, expressed as multiples of the fit-to-viewport scale. */
export const MIN_ZOOM = 1
export const MAX_ZOOM = 16

export const ZOOM_STEP = 1.35
