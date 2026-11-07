/**
 * The studio's numbers ("200+ projects completed"…), edited in the admin at
 * /admin/numbers and stored by lib/homeStatsStore.ts. One set for the whole
 * site, so no two pages can disagree:
 *
 *   - the strip under the homepage's first screen, and the "About" card
 *     further down the homepage: projects, clients, years, countries;
 *   - the row on the About page: years, projects, clients, awards.
 *
 * Shared by the server and the admin's preview, so nothing here touches the
 * store.
 */

/** Fixed places. The id says which one, never what it shows: a place can be relabelled. */
export const STAT_IDS = ['projects', 'clients', 'years', 'countries', 'awards'] as const
export type StatId = typeof STAT_IDS[number]

/** The homepage strip, in its order. */
export const HOME_STAT_IDS: StatId[] = ['projects', 'clients', 'years', 'countries']
/** The About page row, in its order. */
export const ABOUT_PAGE_STAT_IDS: StatId[] = ['years', 'projects', 'clients', 'awards']

export interface HomeStat {
  id:      StatId
  value:   number
  /** Written straight after the number: "+", "%", "K+"… */
  suffix:  string
  labelEn: string
  labelRu: string
  /** Switched off in the admin; unset means the place's default (SHOWN_BY_DEFAULT). */
  visible?: boolean
}

/**
 * Whether a place shows when it was never switched. Awards is off: the
 * studio has none yet, and the number in the template the site started
 * from was not real.
 */
export const SHOWN_BY_DEFAULT: Record<StatId, boolean> = {
  projects:  true,
  clients:   true,
  years:     true,
  countries: true,
  awards:    false,
}

export const isShown = (s: HomeStat): boolean => s.visible ?? SHOWN_BY_DEFAULT[s.id]

export interface HomeStats {
  stats: HomeStat[]
}

/** One number in one language, as the sections take it. */
export interface LocalStat {
  id:     StatId
  value:  number
  suffix: string
  label:  string
}

/** The numbers for `ids` that are switched on, in that order, in one language. */
export function localizeStats(data: HomeStats, locale: string, ids: StatId[] = HOME_STAT_IDS): LocalStat[] {
  const ru = locale === 'ru'
  return ids
    .map((id) => data.stats.find((s) => s.id === id))
    .filter((s): s is HomeStat => !!s && isShown(s))
    .map((s) => ({
      id:     s.id,
      value:  s.value,
      suffix: s.suffix,
      label:  ((ru ? s.labelRu : s.labelEn) || s.labelEn || s.labelRu).trim(),
    }))
}
