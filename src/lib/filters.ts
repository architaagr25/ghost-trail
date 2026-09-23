import type { EventCategory, GameEvent, MapData, MatchSummary, PlayerTrail } from './types'

/** Sentinel for a filter that is not narrowing anything. */
export const ALL = 'all'

export const EVENT_CATEGORIES: EventCategory[] = ['kill', 'death', 'loot', 'storm']

export interface Filters {
  /** A calendar date, or ALL. */
  date: string
  /** A match id, or ALL. */
  matchId: string
  showHumans: boolean
  showBots: boolean
  events: Record<EventCategory, boolean>
}

export interface Selection {
  /** Matches passing the date and match filters, newest first. */
  matches: MatchSummary[]
  /** The single match in view, when exactly one is selected. */
  match: MatchSummary | null
  /** Trails to draw, after every filter. */
  players: PlayerTrail[]
  /** Events to draw, after every filter. */
  events: GameEvent[]
  /**
   * Filtered by date, match and class, but not by event type. The heatmap reads
   * these -- its mode already names the type, so hiding kill markers should not
   * empty the kill zone field.
   */
  scopedEvents: GameEvent[]
  /**
   * Totals before the class and event-type filters. The toggle labels need to
   * show what is there to turn back on, not what is currently on.
   */
  totals: {
    humans: number
    bots: number
    events: Record<EventCategory, number>
  }
}

export const EMPTY_SELECTION: Selection = {
  matches: [],
  match: null,
  players: [],
  events: [],
  scopedEvents: [],
  totals: { humans: 0, bots: 0, events: { kill: 0, death: 0, loot: 0, storm: 0 } },
}

/**
 * Narrows a map's data to what the filters allow, in one pass.
 *
 * Keeping it out of the render layers leaves those presentational, and the map
 * and the numbers beside it end up reading from the same result.
 */
export function selectData(data: MapData, filters: Filters): Selection {
  const matchIndices = new Set<number>()
  const matches: MatchSummary[] = []

  data.matches.forEach((match, index) => {
    if (filters.date !== ALL && match.date !== filters.date) return
    if (filters.matchId !== ALL && match.id !== filters.matchId) return
    matchIndices.add(index)
    matches.push(match)
  })

  const inScope = matchIndices.size === data.matches.length
  const scopedPlayers = inScope
    ? data.players
    : data.players.filter((player) => matchIndices.has(player.m))
  const scopedEvents = inScope
    ? data.events
    : data.events.filter((event) => matchIndices.has(event.m))

  const totals = {
    humans: scopedPlayers.filter((player) => !player.b).length,
    bots: 0,
    events: { kill: 0, death: 0, loot: 0, storm: 0 } as Record<EventCategory, number>,
  }
  totals.bots = scopedPlayers.length - totals.humans
  for (const event of scopedEvents) totals.events[event.c] += 1

  const bothClasses = filters.showHumans && filters.showBots
  const allEvents = EVENT_CATEGORIES.every((category) => filters.events[category])

  const byClass = bothClasses
    ? scopedEvents
    : scopedEvents.filter((event) => (event.b ? filters.showBots : filters.showHumans))

  return {
    matches: [...matches].sort((a, b) => b.start - a.start),
    match: matches.length === 1 ? matches[0] : null,
    players: bothClasses
      ? scopedPlayers
      : scopedPlayers.filter((player) => (player.b ? filters.showBots : filters.showHumans)),
    // Events belong to whoever produced them, so hiding bots hides their kills
    // too -- otherwise there is combat on screen with nobody in it.
    events: allEvents ? byClass : byClass.filter((event) => filters.events[event.c]),
    scopedEvents: byClass,
    totals,
  }
}

/** Matches available for the match picker once the date filter is applied. */
export function matchesForDate(data: MapData, date: string): MatchSummary[] {
  const matches = date === ALL ? data.matches : data.matches.filter((m) => m.date === date)
  return [...matches].sort((a, b) => b.start - a.start)
}
