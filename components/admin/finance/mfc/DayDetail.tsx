'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatMoney, txBase } from '@/lib/finance/money'
import type { FinanceSettings } from '@/lib/finance/types'
import type { MfcCategory, MfcExpense } from '@/lib/mfc/types'
import { useFinanceLang } from '../lang'
import { ExpenseList } from './ExpenseList'
import { friendlyDate } from './shared'

/** Last day of a YYYY-MM, read with UTC fields so no timezone can shift it. */
function monthEnd(key: string): string {
  const y = Number(key.slice(0, 4))
  const m = Number(key.slice(5, 7))
  return `${key}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`
}

/** The window one column of the trend chart stands for. */
export function bucketRange(key: string, granularity: 'day' | 'month'): { from: string; to: string } {
  return granularity === 'month'
    ? { from: `${key}-01`, to: monthEnd(key) }
    : { from: key, to: key }
}

/**
 * What a column of the trend chart was made of.
 *
 * The chart answers "when", and the obvious next question is "on what" — so
 * the column opens. Rows are fetched for that window rather than taken from
 * the summary, which carries only the eight most recent; asking for the whole
 * ledger to fill one day would be a lot of data for a phone to move for a tap.
 *
 * Tapping a row hands it to the edit sheet and closes this one. Two stacked
 * sheets would leave the person unsure which Escape closes what.
 */
export function DayDetail({
  open,
  bucketKey,
  granularity,
  categories,
  settings,
  onClose,
  onEdit,
}: {
  open: boolean
  bucketKey: string | null
  granularity: 'day' | 'month'
  categories: MfcCategory[]
  settings: FinanceSettings
  onClose: () => void
  onEdit: (e: MfcExpense) => void
}) {
  const { t, locale } = useFinanceLang()
  const [rows, setRows] = useState<MfcExpense[] | null>(null)

  const load = useCallback(async () => {
    if (!bucketKey) return
    setRows(null)
    const { from, to } = bucketRange(bucketKey, granularity)
    const res = await fetch(`/api/finance/mfc/expenses?from=${from}&to=${to}`, { cache: 'no-store' })
    setRows(res.ok ? await res.json() : [])
  }, [bucketKey, granularity])

  useEffect(() => { if (open) load() }, [open, load])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open || !bucketKey) return null

  const title = granularity === 'month'
    ? new Date(Number(bucketKey.slice(0, 4)), Number(bucketKey.slice(5, 7)) - 1, 1)
        .toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    : friendlyDate(bucketKey, locale, { today: t('mfc.today'), yesterday: t('mfc.yesterday') })

  const total = (rows ?? []).reduce((s, e) => s + (txBase(e, settings).value ?? 0), 0)

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="fixed inset-0 bg-black/75 fin-fade" onClick={onClose} />

      <div className="relative w-full sm:max-w-md max-h-[85vh] sm:max-h-[80vh] flex flex-col
                      rounded-t-3xl sm:rounded-2xl bg-[#0D0D0D] border-t sm:border border-[#232323] shadow-2xl mfc-sheet">
        <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0">
          <span className="w-10 h-1 rounded-full bg-[#2E2E2E]" />
        </div>

        <div className="flex items-start justify-between gap-3 px-5 pt-3 sm:pt-5 pb-4 border-b border-[#1A1A1A] shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#5A5A5A] mb-1.5">
              {title}
            </p>
            <p className="text-[26px] leading-none font-bold text-white tabular-nums">
              {formatMoney(total, settings.baseCurrency, { locale })}
            </p>
            {rows && (
              <p className="text-[11px] text-[#5A5A5A] mt-1.5">
                {t('mfc.times', { n: rows.length })}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-[#777] hover:text-white hover:bg-[#1A1A1A] transition-colors active:scale-95"
            aria-label={t('common.cancel')}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M3 3l9 9M12 3l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {rows === null ? (
            <div className="h-24 rounded-xl bg-[#111] animate-pulse" />
          ) : (
            <ExpenseList
              expenses={rows}
              categories={categories}
              settings={settings}
              // A single day already has its date and its total in the header
              // above; a month's worth still wants them per day.
              showDayHeaders={granularity === 'month'}
              onEdit={(e) => { onClose(); onEdit(e) }}
              emptyTitle={t('mfc.emptyPeriod')}
              emptyHint={t('mfc.emptyHint')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
