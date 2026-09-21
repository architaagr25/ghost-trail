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
   * Totals within the selected matches, before the class and event-type
   * filters. These feed the toggle labels, which have to keep showing what is
   * available to turn back on rather than what is currently showing.
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
  totals: { humans: 0, bots: 0, events: { kill: 0, death: 0, loot: 0, storm: 0 } },
}

/**
 * Narrows a map's data down to what the filters allow.
 *
 * Filtering happens here in one pass rather than inside the render layers. The
 * layers stay presentational, and because the panels and the map read the same
 * result, the picture and the numbers beside it cannot disagree.
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

  return {
    matches: [...matches].sort((a, b) => b.start - a.start),
    match: matches.length === 1 ? matches[0] : null,
    players: bothClasses
      ? scopedPlayers
      : scopedPlayers.filter((player) => (player.b ? filters.showBots : filters.showHumans)),
    // An event belongs to the actor that produced it, so hiding bots hides
    // their kills too. Leaving them behind would show combat with no visible
    // participant.
    events:
      bothClasses && allEvents
        ? scopedEvents
        : scopedEvents.filter(
            (event) =>
              filters.events[event.c] && (event.b ? filters.showBots : filters.showHumans),
          ),
    totals,
  }
}

/** Matches available for the match picker once the date filter is applied. */
export function matchesForDate(data: MapData, date: string): MatchSummary[] {
  const matches = date === ALL ? data.matches : data.matches.filter((m) => m.date === date)
  return [...matches].sort((a, b) => b.start - a.start)
}
