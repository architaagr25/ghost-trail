import { create } from 'zustand'
import { loadIndex, loadMap } from '../lib/data'
import { ALL } from '../lib/filters'
import type { DataIndex, EventCategory, MapData } from '../lib/types'

type Status = 'loading' | 'ready' | 'error'

interface AppState {
  index: DataIndex | null
  mapKey: string | null
  mapData: MapData | null
  status: Status
  error: string | null

  date: string
  matchId: string
  showHumans: boolean
  showBots: boolean
  events: Record<EventCategory, boolean>

  /** Playhead position, in seconds since the start of the selected match. */
  time: number
  playing: boolean
  /** Playback rate as a multiple of real time. */
  speed: number

  init: () => Promise<void>
  selectMap: (key: string) => Promise<void>
  setDate: (date: string) => void
  setMatch: (matchId: string) => void
  toggleClass: (which: 'humans' | 'bots') => void
  toggleEvent: (category: EventCategory) => void
  setTime: (time: number) => void
  setPlaying: (playing: boolean) => void
  setSpeed: (speed: number) => void
}

/** Offered playback rates. Real time is slow going for a ten minute match. */
export const SPEEDS = [0.5, 1, 2, 4, 8] as const

const ALL_EVENTS: Record<EventCategory, boolean> = {
  kill: true,
  death: true,
  loot: true,
  storm: true,
}

/**
 * Filter and playback state for the whole tool.
 *
 * This lives in a store rather than in component state because the rail, the
 * map, the timeline and the detail panels all read the same selection, and
 * passing it down would mean threading it through every layer of the tree.
 */
export const useApp = create<AppState>((set, get) => ({
  index: null,
  mapKey: null,
  mapData: null,
  status: 'loading',
  error: null,

  date: ALL,
  matchId: ALL,
  showHumans: true,
  showBots: true,
  events: { ...ALL_EVENTS },
  time: 0,
  playing: false,
  speed: 2,

  async init() {
    try {
      const index = await loadIndex()
      const first = index.maps[0]
      if (!first) throw new Error('No maps found in the data index.')
      set({ index })
      await get().selectMap(first.map)
    } catch (cause) {
      set({ status: 'error', error: describe(cause) })
    }
  },

  async selectMap(key) {
    const entry = get().index?.maps.find((map) => map.map === key)
    if (!entry) return

    // Filters are scoped to a map: its dates and match ids mean nothing on
    // another one, so they reset rather than silently matching nothing.
    set({
      status: 'loading',
      error: null,
      mapKey: key,
      date: ALL,
      matchId: ALL,
      time: 0,
      playing: false,
    })

    try {
      const mapData = await loadMap(entry.file)
      // A slower earlier request must not overwrite a newer selection.
      if (get().mapKey !== key) return
      set({ mapData, status: 'ready' })
    } catch (cause) {
      if (get().mapKey === key) set({ status: 'error', error: describe(cause) })
    }
  },

  setDate(date) {
    const { mapData, matchId } = get()
    // Keep the chosen match only if it still falls inside the new date.
    const match = mapData?.matches.find((m) => m.id === matchId)
    const keep = matchId !== ALL && match && (date === ALL || match.date === date)
    set({
      date,
      matchId: keep ? matchId : ALL,
      time: keep ? get().time : 0,
      playing: keep ? get().playing : false,
    })
  },

  setMatch(matchId) {
    // A different match has its own clock, so the playhead goes back to zero
    // and playback stops rather than running on into unrelated data.
    set({ matchId, time: 0, playing: false })
  },

  toggleClass(which) {
    const { showHumans, showBots } = get()
    const next = which === 'humans' ? !showHumans : !showBots
    const other = which === 'humans' ? showBots : showHumans

    // Turning both off leaves an empty map with no obvious way back, so the
    // last one on stays on.
    if (!next && !other) return
    set(which === 'humans' ? { showHumans: next } : { showBots: next })
  },

  toggleEvent(category) {
    const events = get().events
    set({ events: { ...events, [category]: !events[category] } })
  },

  setTime(time) {
    set({ time: Math.max(0, time) })
  },

  setPlaying(playing) {
    set({ playing })
  },

  setSpeed(speed) {
    set({ speed })
  },
}))

function describe(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}
