import en from '@/messages/en.json'
import ru from '@/messages/ru.json'
import { readStore, writeStore } from './store'
import { HomeStatsSchema } from './validation'
import { STAT_IDS, type HomeStats, type StatId } from './homeStats'

const KEY = 'homestats'

// What the site showed before the numbers could be edited; the labels are
// still the ones in the message files.
const VALUES: Record<StatId, number> = { projects: 200, clients: 80, years: 6, countries: 5 }

export const DEFAULT_HOME_STATS: HomeStats = {
  stats: STAT_IDS.map((id) => ({
    id,
    value:   VALUES[id],
    suffix:  '+',
    labelEn: en.about.stats[id],
    labelRu: ru.about.stats[id],
  })),
}

export async function getHomeStats(): Promise<HomeStats> {
  const stored = await readStore<unknown>(KEY, DEFAULT_HOME_STATS)
  const parsed = HomeStatsSchema.safeParse(stored)
  if (parsed.success) return parsed.data
  console.warn('[homeStats] stored numbers are invalid, using the defaults', parsed.error.issues.slice(0, 3))
  return DEFAULT_HOME_STATS
}

export async function saveHomeStats(data: HomeStats): Promise<void> {
  await writeStore<HomeStats>(KEY, data)
}
