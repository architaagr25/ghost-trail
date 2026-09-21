import type { GameEvent, MapData, MatchSummary, PlayerTrail } from './types'

/** Sentinel for a filter that is not narrowing anything. */
export const ALL = 'all'

export interface Selection {
  /** Matches passing the current filters, newest first. */
  matches: MatchSummary[]
  players: PlayerTrail[]
  events: GameEvent[]
  /** The single match in view, when exactly one is selected. */
  match: MatchSummary | null
}

/**
 * Narrows a map's data to the active date and match.
 *
 * Filtering runs over the whole map in one pass rather than being pushed into
 * the layers. The layers stay presentational, and the same result feeds the
 * panels and the counts, so the map and the numbers beside it cannot disagree.
 */
export function selectData(data: MapData, date: string, matchId: string): Selection {
  const matchIndices = new Set<number>()
  const matches: MatchSummary[] = []

  data.matches.forEach((match, index) => {
    if (date !== ALL && match.date !== date) return
    if (matchId !== ALL && match.id !== matchId) return
    matchIndices.add(index)
    matches.push(match)
  })

  // Nothing is narrowed, so skip the per-row work entirely.
  const everything = matchIndices.size === data.matches.length

  return {
    matches: [...matches].sort((a, b) => b.start - a.start),
    players: everything ? data.players : data.players.filter((p) => matchIndices.has(p.m)),
    events: everything ? data.events : data.events.filter((e) => matchIndices.has(e.m)),
    match: matches.length === 1 ? matches[0] : null,
  }
}

/** Matches available for the match picker once the date filter is applied. */
export function matchesForDate(data: MapData, date: string): MatchSummary[] {
  const matches = date === ALL ? data.matches : data.matches.filter((m) => m.date === date)
  return [...matches].sort((a, b) => b.start - a.start)
}
