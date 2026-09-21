import { create } from 'zustand'
import { loadIndex, loadMap } from '../lib/data'
import { ALL } from '../lib/filters'
import type { DataIndex, MapData } from '../lib/types'

type Status = 'loading' | 'ready' | 'error'

interface AppState {
  index: DataIndex | null
  mapKey: string | null
  mapData: MapData | null
  status: Status
  error: string | null

  /** A calendar date, or ALL. */
  date: string
  /** A match id, or ALL. */
  matchId: string

  init: () => Promise<void>
  selectMap: (key: string) => Promise<void>
  setDate: (date: string) => void
  setMatch: (matchId: string) => void
}

/**
 * Filter state for the whole tool.
 *
 * Map data lives here rather than in component state because the rail, the map
 * and the detail panels all read the same selection, and passing it down would
 * mean threading it through every layer of the tree.
 */
export const useApp = create<AppState>((set, get) => ({
  index: null,
  mapKey: null,
  mapData: null,
  status: 'loading',
  error: null,
  date: ALL,
  matchId: ALL,

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
    const entry = get().index?.maps.find((m) => m.map === key)
    if (!entry) return

    // Filters are scoped to a map: its dates and match ids mean nothing on
    // another one, so both reset rather than silently matching nothing.
    set({ status: 'loading', error: null, mapKey: key, date: ALL, matchId: ALL })

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
    // Keep the match only if it still falls inside the new date.
    const match = mapData?.matches.find((m) => m.id === matchId)
    const keep = matchId !== ALL && match && (date === ALL || match.date === date)
    set({ date, matchId: keep ? matchId : ALL })
  },

  setMatch(matchId) {
    set({ matchId })
  },
}))

function describe(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}
