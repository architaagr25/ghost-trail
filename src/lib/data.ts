import type { DataIndex, MapData } from './types'
import { validateMapData } from './validate'

/**
 * Each map is fetched whole and cached -- around 300 KB over the wire at worst.
 * That buys instant match switching and heatmaps spanning every match on it.
 */
const cache = new Map<string, Promise<MapData>>()

async function getJson<T>(url: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(url)
  } catch {
    // Browser network errors are vague and inconsistent; say what it means.
    throw new Error(`Could not reach ${url}. Check the connection and retry.`)
  }

  if (!response.ok) {
    const detail = response.status === 404 ? 'not found' : `HTTP ${response.status}`
    throw new Error(`Could not load ${url} (${detail}).`)
  }

  try {
    return (await response.json()) as T
  } catch {
    throw new Error(`${url} is not valid JSON. It may be truncated.`)
  }
}

export async function loadIndex(): Promise<DataIndex> {
  const index = await getJson<unknown>('/data/index.json')
  const maps =
    typeof index === 'object' && index !== null && Array.isArray((index as DataIndex).maps)
      ? (index as DataIndex).maps.filter((entry) => entry?.map && entry?.file)
      : []

  if (!maps.length) {
    throw new Error('The data index lists no maps. Run the pipeline to generate it.')
  }
  return { maps }
}

export function loadMap(file: string): Promise<MapData> {
  let pending = cache.get(file)
  if (!pending) {
    // Cache the promise, not the result, so concurrent callers share one fetch.
    pending = getJson<unknown>(file)
      .then(validateMapData)
      .catch((error: unknown) => {
        // Drop it, or Retry just replays the rejection.
        cache.delete(file)
        throw error
      })
    cache.set(file, pending)
  }
  return pending
}
