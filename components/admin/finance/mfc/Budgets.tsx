'use client'

import { formatMoney } from '@/lib/finance/money'
import { MFC_BUDGET, MFC_TRACK, budgetTone, chipColor } from '@/lib/mfc/palette'
import type { Currency } from '@/lib/finance/types'
import type { MfcBudgetLine } from '@/lib/mfc/types'
import { useFinanceLang } from '../lang'
import { catLabel } from './shared'

/**
 * A category against its monthly cap — a ratio against a limit, so a meter
 * rather than a chart.
 *
 * The colour is a status, and status colour never carries the message alone:
 * every row states the number beside it ("32 000 left", "18 000 over"), so a
 * red bar is confirmation, not the only signal. The track is the same shape
 * whatever the state, so rows stay comparable down the column.
 */
export function Budgets({
  budgets,
  month,
  currency,
}: {
  budgets: MfcBudgetLine[]
  /** YYYY-MM the figures are measured over. */
  month: string
  currency: Currency
}) {
  const { t, lang, locale, month: monthName } = useFinanceLang()
  const money = (v: number) => formatMoney(v, currency, { locale })
  const monthLabel = `${monthName(Number(month.slice(5, 7)) - 1)} ${month.slice(0, 4)}`

  return (
    <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-5">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 className="text-sm font-semibold text-white">{t('mfc.budgets')}</h2>
      </div>
      <p className="text-[11px] text-[#5A5A5A] leading-snug mb-4">
        {t('mfc.budgetsHint', { month: monthLabel })}
      </p>

      {budgets.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-[13px] text-[#777] mb-1">{t('mfc.noBudgets')}</p>
          <p className="text-[11px] text-[#555]">{t('mfc.noBudgetsHint')}</p>
        </div>
      ) : (
        <ul className="space-y-3.5">
          {budgets.map((b) => {
            const tone = budgetTone(b.ratio)
            const color = MFC_BUDGET[tone]
            const rest = b.limit - b.spent
            return (
              <li key={b.categoryId}>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span
                    className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[12px] leading-none"
                    style={{ background: `${chipColor(b.colorSlot)}26` }}
                    aria-hidden="true"
                  >
                    {b.icon}
                  </span>
                  <span className="text-[12px] text-white truncate flex-1">{catLabel(b, lang, '—')}</span>
                  <span className="text-[11px] tabular-nums shrink-0" style={{ color: tone === 'under' ? '#8A8A8A' : color }}>
                    {rest >= 0
                      ? t('mfc.budgetLeft', { amount: money(rest) })
                      : t('mfc.budgetOver', { amount: money(-rest) })}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: MFC_TRACK }}
                     role="meter" aria-valuenow={Math.round(b.ratio * 100)} aria-valuemin={0} aria-valuemax={100}
                     aria-label={`${catLabel(b, lang, '—')}: ${money(b.spent)} / ${money(b.limit)}`}>
                  <div
                    className="h-full rounded-full transition-[width] duration-300 ease-out"
                    style={{ width: `${Math.min(b.ratio, 1) * 100}%`, background: color }}
                  />
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-[10px] text-[#5A5A5A] tabular-nums">{money(b.spent)}</span>
                  <span className="text-[10px] text-[#5A5A5A] tabular-nums">{money(b.limit)}</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
