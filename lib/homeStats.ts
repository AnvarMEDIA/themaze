/**
 * The four numbers under the homepage's first screen ("200+ projects
 * completed"…), which the "About" card further down repeats. Edited in the
 * admin at /admin/numbers; stored by lib/homeStatsStore.ts.
 *
 * Shared by the server and the admin's preview, so nothing here touches the
 * store.
 */

/** Four fixed places. The id says which one, never what it shows: a place can be relabelled. */
export const STAT_IDS = ['projects', 'clients', 'years', 'countries'] as const
export type StatId = typeof STAT_IDS[number]

export interface HomeStat {
  id:      StatId
  value:   number
  /** Written straight after the number: "+", "%", "K+"… */
  suffix:  string
  labelEn: string
  labelRu: string
}

export interface HomeStats {
  /** In the order the first screen shows them. */
  stats: HomeStat[]
}

/** One number in one language, as the sections take it. */
export interface LocalStat {
  id:     StatId
  value:  number
  suffix: string
  label:  string
}

export function localizeStats(data: HomeStats, locale: string): LocalStat[] {
  const ru = locale === 'ru'
  return data.stats.map((s) => ({
    id:     s.id,
    value:  s.value,
    suffix: s.suffix,
    label:  ((ru ? s.labelRu : s.labelEn) || s.labelEn || s.labelRu).trim(),
  }))
}
