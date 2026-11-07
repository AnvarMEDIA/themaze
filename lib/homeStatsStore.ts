import en from '@/messages/en.json'
import ru from '@/messages/ru.json'
import { readStore, writeStore } from './store'
import { HomeStatsSchema } from './validation'
import { STAT_IDS, type HomeStat, type HomeStats, type StatId } from './homeStats'

const KEY = 'homestats'

// What the site showed before the numbers could be edited; the captions
// are still the ones in the message files.
const DEFAULTS: Record<StatId, HomeStat> = {
  projects:  { id: 'projects',  value: 200, suffix: '+', labelEn: en.about.stats.projects,  labelRu: ru.about.stats.projects },
  clients:   { id: 'clients',   value: 80,  suffix: '+', labelEn: en.about.stats.clients,   labelRu: ru.about.stats.clients },
  years:     { id: 'years',     value: 6,   suffix: '+', labelEn: en.about.stats.years,     labelRu: ru.about.stats.years },
  countries: { id: 'countries', value: 5,   suffix: '+', labelEn: en.about.stats.countries, labelRu: ru.about.stats.countries },
  awards:    { id: 'awards',    value: 0,   suffix: '',  labelEn: en.aboutPage.statsAwards, labelRu: ru.aboutPage.statsAwards, visible: false },
}

export const DEFAULT_HOME_STATS: HomeStats = { stats: STAT_IDS.map((id) => DEFAULTS[id]) }

/**
 * Every place, in STAT_IDS order: a set saved before a place existed
 * (the first version had no "awards") gets that place's default.
 */
function complete(data: HomeStats): HomeStats {
  return { stats: STAT_IDS.map((id) => data.stats.find((s) => s.id === id) ?? DEFAULTS[id]) }
}

export async function getHomeStats(): Promise<HomeStats> {
  const stored = await readStore<unknown>(KEY, DEFAULT_HOME_STATS)
  const parsed = HomeStatsSchema.safeParse(stored)
  if (parsed.success) return complete(parsed.data)
  console.warn('[homeStats] stored numbers are invalid, using the defaults', parsed.error.issues.slice(0, 3))
  return DEFAULT_HOME_STATS
}

/** Saves the set, filled out to every place; returns what was saved. */
export async function saveHomeStats(data: HomeStats): Promise<HomeStats> {
  const full = complete(data)
  await writeStore<HomeStats>(KEY, full)
  return full
}
