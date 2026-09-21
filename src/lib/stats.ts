import type { GameEvent, MapData, MatchSummary, PlayerTrail } from './types'

export interface PlayerStats {
  /** Ground covered along the trail, in metres. */
  distance: number
  /** Seconds between the player's first and last recorded event. */
  duration: number
  /** Average speed over the journey, in metres per second. */
  pace: number
  kills: number
  deaths: number
  loot: number
  storm: number
  /** False once the player has a death or storm event on record. */
  survived: boolean
}

/**
 * Totals for one journey.
 *
 * Distance is summed along the trail and deliberately skips recording gaps: a
 * straight line across a gap is an artefact of the sampling, and counting it
 * would inflate distance and pace for exactly the players whose data is worst.
 */
export function playerStats(
  player: PlayerTrail,
  playerIndex: number,
  events: GameEvent[],
): PlayerStats {
  const breaks = new Set(player.breaks)
  let distance = 0
  for (let i = 1; i < player.x.length; i += 1) {
    if (breaks.has(i)) continue
    distance += Math.hypot(player.x[i] - player.x[i - 1], player.z[i] - player.z[i - 1])
  }

  const times = player.t
  const own = events.filter((event) => event.p === playerIndex)
  const count = (category: GameEvent['c']) => own.filter((e) => e.c === category).length

  const first = times.length ? times[0] : 0
  const last = times.length ? times[times.length - 1] : 0
  const eventEnd = own.reduce((max, event) => Math.max(max, event.t), last)
  const duration = Math.max(eventEnd - first, 0)

  const deaths = count('death')
  const storm = count('storm')

  return {
    distance,
    duration,
    pace: duration > 0 ? distance / duration : 0,
    kills: count('kill'),
    deaths,
    loot: count('loot'),
    storm,
    survived: deaths + storm === 0,
  }
}

export interface SurvivalPoint {
  /** Seconds since match start. */
  t: number
  alive: number
}

/**
 * Players still alive over the course of a match.
 *
 * Built from the match's own events rather than the filtered selection: the
 * curve describes what happened in the match, and it should not change shape
 * because someone hid bots or unticked storm deaths.
 *
 * Nobody is recorded leaving alive, so the curve ends wherever the last death
 * left it rather than dropping to zero.
 */
export function survivalCurve(data: MapData, match: MatchSummary): SurvivalPoint[] {
  const matchIndex = data.matches.indexOf(match)
  if (matchIndex < 0) return []

  const deaths = data.events
    .filter(
      (event) => event.m === matchIndex && (event.c === 'death' || event.c === 'storm'),
    )
    .map((event) => event.t)
    .sort((a, b) => a - b)

  let alive = match.humans + match.bots
  const points: SurvivalPoint[] = [{ t: 0, alive }]

  for (const t of deaths) {
    alive -= 1
    points.push({ t, alive })
  }

  points.push({ t: Math.max(match.duration, 1), alive })
  return points
}
