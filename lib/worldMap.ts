import { readStore, writeStore } from './store'
import { WorldMapSchema } from './validation'
import { DEFAULT_WORLD_MAP, type WorldMapData } from './geo/mapData'

const KEY = 'worldmap'

/**
 * The countries and cities on the homepage map. Until the admin saves a
 * list of its own, the one in DEFAULT_WORLD_MAP.
 */
export async function getWorldMap(): Promise<WorldMapData> {
  const stored = await readStore<unknown>(KEY, DEFAULT_WORLD_MAP)
  const parsed = WorldMapSchema.safeParse(stored)
  if (parsed.success) return parsed.data
  // Saves are validated, so this means the record was edited by hand or
  // the schema moved on; show the defaults rather than a broken section.
  console.warn('[worldMap] stored map is invalid, using the defaults', parsed.error.issues.slice(0, 3))
  return DEFAULT_WORLD_MAP
}

export async function saveWorldMap(data: WorldMapData): Promise<void> {
  await writeStore<WorldMapData>(KEY, data)
}
