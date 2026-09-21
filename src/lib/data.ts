import type { DataIndex, MapData } from './types'

/**
 * Every map's data is fetched whole and cached. The largest map is around
 * 300 KB over the wire, so loading it once buys instant match switching and
 * lets heatmaps aggregate across every match on the map.
 */
const cache = new Map<string, Promise<MapData>>()

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Could not load ${url} (${response.status})`)
  }
  return response.json() as Promise<T>
}

export function loadIndex(): Promise<DataIndex> {
  return getJson<DataIndex>('/data/index.json')
}

export function loadMap(file: string): Promise<MapData> {
  let pending = cache.get(file)
  if (!pending) {
    // Cache the promise, not the result, so concurrent callers share one fetch.
    pending = getJson<MapData>(file).catch((error) => {
      cache.delete(file)
      throw error
    })
    cache.set(file, pending)
  }
  return pending
}
