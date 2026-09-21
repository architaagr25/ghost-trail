/** Shapes emitted by `pipeline/build.py`. Keep in sync with that script. */

export interface MapSummary {
  map: string
  label: string
  file: string
  matches: number
  players: number
  events: number
  dates: string[]
}

export interface DataIndex {
  maps: MapSummary[]
}

/** The world-to-minimap transform constants for one map. */
export interface MapProjection {
  scale: number
  originX: number
  originZ: number
}

export interface MatchSummary {
  id: string
  /** Calendar date the match started on, YYYY-MM-DD. */
  date: string
  /** Epoch seconds at the first recorded event. */
  start: number
  /** Match length in seconds. */
  duration: number
  humans: number
  bots: number
  kills: number
  deaths: number
  loot: number
  storm: number
}

/**
 * One player's journey through one match. Trail points are stored as parallel
 * arrays rather than point objects to keep the payload small.
 */
export interface PlayerTrail {
  /** Index into `MapData.matches`. */
  m: number
  /** Player or bot identifier. */
  u: string
  /** 1 when this is a bot. */
  b: 0 | 1
  /** Seconds since match start, one per trail point. */
  t: number[]
  x: number[]
  z: number[]
  /**
   * Indices where recording dropped out and the trail must be cut rather than
   * bridged. Each index is the first point of a new segment.
   */
  breaks: number[]
}

export type EventCategory = 'kill' | 'death' | 'loot' | 'storm'

export interface GameEvent {
  /** Index into `MapData.matches`. */
  m: number
  /** Index into `MapData.players`. */
  p: number
  c: EventCategory
  b: 0 | 1
  /** Seconds since match start. */
  t: number
  x: number
  z: number
}

export interface MapData {
  map: string
  label: string
  config: MapProjection
  image: string
  matches: MatchSummary[]
  players: PlayerTrail[]
  events: GameEvent[]
}
