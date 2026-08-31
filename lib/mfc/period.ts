/**
 * Whose calendar an MFC request is answered on.
 *
 * The server runs in UTC. The person using this lives in Tashkent, five hours
 * ahead. Between midnight and 05:00 their date is already tomorrow's — and on
 * the first of a month, their MONTH is already the next one. An expense they
 * record at 02:44 on 1 September is dated 2026-09-01 by the browser, while a
 * server asked for "this month" resolves August and reports nothing: the money
 * is in the ledger and missing from the dashboard.
 *
 * So the browser resolves the window, because it is the only side that knows
 * what day it is where the user is standing, and sends concrete dates. The
 * preset name travels with them — not to be re-resolved, but so "vs previous
 * period" still steps back one calendar month rather than by the range's own
 * length, which is what an anonymous custom range gets.
 */
import { PERIOD_PRESETS, periodFromParams, type Period, type PeriodPreset } from '../finance/period'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isPreset(v: string | null | undefined): v is PeriodPreset {
  return Boolean(v) && (PERIOD_PRESETS as readonly string[]).includes(v as string)
}

export function mfcPeriodFromParams(params: {
  preset?: string | null
  from?: string | null
  to?: string | null
}): Period {
  const from = params.from && DATE_RE.test(params.from) ? params.from : ''
  const to = params.to && DATE_RE.test(params.to) ? params.to : ''

  if (from && to && isPreset(params.preset) && params.preset !== 'custom') {
    const [a, b] = from > to ? [to, from] : [from, to]
    return { from: a, to: b, preset: params.preset }
  }

  // No client-resolved window (an old bookmark, a hand-typed URL): fall back to
  // the shared behaviour rather than refusing to answer.
  return periodFromParams(params)
}

/**
 * The moment to reckon "now" from — the browser's date when it sent one.
 *
 * Noon, not midnight: the only thing read off it is the calendar day, and
 * midday is the furthest a parsed date can sit from being knocked into an
 * adjacent day by anything.
 */
export function mfcNow(today: string | null | undefined): Date {
  if (!today || !DATE_RE.test(today)) return new Date()
  const [y, m, d] = today.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}
