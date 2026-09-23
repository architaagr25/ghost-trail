import type { EventCategory, GameEvent, MapData, MatchSummary, PlayerTrail } from './types'

const CATEGORIES = new Set<EventCategory>(['kill', 'death', 'loot', 'storm'])

/**
 * Checks a map payload before the renderer sees it.
 *
 * None of this fires on pipeline output. It is here for the stale or
 * half-written file, where the alternative is a blank canvas and a throw from
 * somewhere deep in a render loop.
 *
 * Anything unusable throws; anything skippable is dropped with a count logged.
 * A few malformed rows should not cost the other 89,000 good ones.
 */
export function validateMapData(raw: unknown): MapData {
  if (!isRecord(raw)) throw new Error('Map data is not an object.')

  const { map, label, image } = raw
  if (typeof map !== 'string' || typeof image !== 'string') {
    throw new Error('Map data is missing its identifier or minimap image.')
  }

  const config = raw.config
  if (
    !isRecord(config) ||
    !isFinite(config.scale) ||
    !isFinite(config.originX) ||
    !isFinite(config.originZ) ||
    (config.scale as number) <= 0
  ) {
    // A broken transform piles every coordinate on one spot, which reads as a
    // rendering bug rather than a data one.
    throw new Error(`Map "${map}" has no usable coordinate configuration.`)
  }

  if (!Array.isArray(raw.matches) || !Array.isArray(raw.players) || !Array.isArray(raw.events)) {
    throw new Error(`Map "${map}" is missing its matches, players or events.`)
  }

  const matches = raw.matches.filter(isMatch)
  if (!matches.length) throw new Error(`Map "${map}" contains no usable matches.`)

  // Trails are repaired rather than dropped: events address players by index,
  // so removing one would silently repoint every event after it.
  const players = raw.players.map((player) => repairTrail(player, matches.length))

  const events = raw.events.filter(
    (event): event is GameEvent =>
      isRecord(event) &&
      typeof event.c === 'string' &&
      CATEGORIES.has(event.c as EventCategory) &&
      isIndex(event.m, matches.length) &&
      isIndex(event.p, players.length) &&
      isFinite(event.t) &&
      isFinite(event.x) &&
      isFinite(event.z),
  )

  report(map, 'matches', raw.matches.length, matches.length)
  report(map, 'events', raw.events.length, events.length)

  return {
    map,
    label: typeof label === 'string' && label ? label : map,
    config: {
      scale: config.scale as number,
      originX: config.originX as number,
      originZ: config.originZ as number,
    },
    image,
    matches,
    players,
    events,
  }
}

/**
 * Trims a trail to the part that is actually drawable.
 *
 * t, x and z are written in parallel, so a truncated file leaves one shorter
 * than the rest. Cutting all three to the shortest keeps every surviving point
 * paired with its real timestamp instead of drawing at undefined coordinates.
 */
function repairTrail(raw: unknown, matchCount: number): PlayerTrail {
  const source = isRecord(raw) ? raw : {}
  const t = numbers(source.t)
  const x = numbers(source.x)
  const z = numbers(source.z)
  const length = Math.min(t.length, x.length, z.length)

  return {
    m: isIndex(source.m, matchCount) ? (source.m as number) : 0,
    u: typeof source.u === 'string' ? source.u : 'unknown',
    b: source.b === 1 ? 1 : 0,
    t: t.slice(0, length),
    x: x.slice(0, length),
    z: z.slice(0, length),
    breaks: Array.isArray(source.breaks)
      ? source.breaks.filter(
          (index): index is number => Number.isInteger(index) && index > 0 && index < length,
        )
      : [],
  }
}

function isMatch(raw: unknown): raw is MatchSummary {
  return (
    isRecord(raw) &&
    typeof raw.id === 'string' &&
    typeof raw.date === 'string' &&
    isFinite(raw.start) &&
    isFinite(raw.duration)
  )
}

function numbers(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is number => Number.isFinite(entry))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isFinite(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value)
}

function isIndex(value: unknown, limit: number): boolean {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < limit
}

function report(map: string, what: string, before: number, after: number): void {
  if (before === after) return
  console.warn(`Ghost Trail: dropped ${before - after} malformed ${what} on ${map}.`)
}
