'use client'

import { useMemo } from 'react'
import { formatMoney, txBase } from '@/lib/finance/money'
import { categoryColor } from '@/lib/mfc/palette'
import type { Currency, FinanceSettings } from '@/lib/finance/types'
import type { MfcCategory, MfcExpense } from '@/lib/mfc/types'
import { useFinanceLang } from '../lang'
import { catLabel, friendlyDate } from './shared'

/**
 * The ledger as a table — the wide-screen view of the same rows the phone
 * shows as a list.
 *
 * A list has one line per row and everything competes for it, so the payment
 * method ended up crammed next to the note and could only be read one row at a
 * time. In a table it gets a column: "what did I pay in cash this month" is
 * then a glance down one strip of the screen, which is the whole reason to
 * spend the extra width a desktop has.
 *
 * Days still group, with the day's total on the group line. That figure is
 * what changes behaviour — a table of individual amounts says what was bought,
 * "Tuesday: 340 000" says whether the day went well — so it survives the
 * change of shape. It also means the date is stated once per day instead of
 * repeating down a column, which is why there is no date column.
 */
export function ExpenseTable({
  expenses,
  categories,
  settings,
  onEdit,
  emptyTitle,
  emptyHint,
}: {
  expenses: MfcExpense[]
  categories: MfcCategory[]
  settings: FinanceSettings
  onEdit?: (e: MfcExpense) => void
  emptyTitle: string
  emptyHint: string
}) {
  const { t, lang, locale } = useFinanceLang()
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const base: Currency = settings.baseCurrency

  const groups = useMemo(() => {
    const out: { date: string; rows: MfcExpense[]; total: number }[] = []
    for (const e of expenses) {
      const last = out[out.length - 1]
      const value = txBase(e, settings).value ?? 0
      if (last && last.date === e.date) { last.rows.push(e); last.total += value }
      else out.push({ date: e.date, rows: [e], total: value })
    }
    return out
  }, [expenses, settings])

  if (expenses.length === 0) {
    return (
      <div className="rounded-xl border border-[#1E1E1E] bg-[#0D0D0D] px-6 py-14 text-center">
        <p className="text-white font-semibold mb-1">{emptyTitle}</p>
        <p className="text-sm text-[#666]">{emptyHint}</p>
      </div>
    )
  }

  // No `overflow-hidden` on the card: a clipping ancestor would become the
  // scroll container for the pinned header row and strand it inside the box.
  return (
    <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E]">
      <table className="w-full text-[13px] border-collapse">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-[#555]">
            {/* Sticky on the cells rather than the row — the row-level version
                is ignored by parts of Safari, and a header that scrolls away
                takes the meaning of the columns with it.
                The offset is where the MFC bar ends. */}
            {[
              { key: 'cat',    label: t('mfc.category'),   cls: 'px-5 w-[34%]' },
              { key: 'method', label: t('mfc.colMethod'),  cls: 'px-3 w-[18%]' },
              { key: 'note',   label: t('mfc.note'),       cls: 'px-3' },
              { key: 'amount', label: t('txns.colAmount'), cls: 'px-5 text-right whitespace-nowrap' },
            ].map((c) => (
              <th
                key={c.key}
                className={`sticky top-[113px] lg:top-[57px] z-10 bg-[#0B0B0B]/95 backdrop-blur
                            border-b border-[#1A1A1A] font-medium py-3 ${c.cls}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>

        {groups.map((g) => (
          <tbody key={g.date}>
            <tr className="bg-[#0B0B0B] border-y border-[#161616]">
              <th
                scope="colgroup"
                colSpan={3}
                className="text-left font-semibold px-5 py-2 text-[11px] tracking-[0.08em] uppercase text-[#6A6A6A]"
              >
                {friendlyDate(g.date, locale, { today: t('mfc.today'), yesterday: t('mfc.yesterday') })}
              </th>
              <td className="px-5 py-2 text-right text-[11px] text-[#8A8A8A] tabular-nums">
                {formatMoney(g.total, base, { locale })}
              </td>
            </tr>

            {g.rows.map((e) => {
              const cat = e.categoryId ? byId.get(e.categoryId) : undefined
              const { value, locked } = txBase(e, settings)
              const foreign = e.currency !== base
              return (
                <tr
                  key={e.id}
                  {...(onEdit
                    ? { onClick: () => onEdit(e), tabIndex: 0,
                        onKeyDown: (ev: React.KeyboardEvent) => {
                          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onEdit(e) }
                        } }
                    : {})}
                  className={`border-b border-[#141414] last:border-b-0 transition-colors duration-150 ${
                    onEdit ? 'cursor-pointer hover:bg-[#111] focus:bg-[#111] focus:outline-none' : ''
                  }`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[14px] leading-none"
                        style={{ background: cat ? `${categoryColor(cat)}26` : '#1A1A1A' }}
                        aria-hidden="true"
                      >
                        {cat?.icon ?? '·'}
                      </span>
                      <span className="text-white truncate">
                        {catLabel(cat, lang, t('mfc.uncategorised'))}
                      </span>
                    </div>
                  </td>

                  <td className="px-3 py-3 text-[#8A8A8A] whitespace-nowrap">{t(`method.${e.method}`)}</td>

                  <td className="px-3 py-3 text-[#6F6F6F]">
                    <span className="block truncate max-w-[280px]">{e.note || '—'}</span>
                  </td>

                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <span className="text-white tabular-nums font-medium">
                      {formatMoney(e.amount, e.currency, { locale })}
                    </span>
                    {foreign && (
                      <span
                        className="block text-[11px] text-[#5A5A5A] tabular-nums"
                        title={locked
                          ? t('tf.fxLocked', { rate: e.fxRate ?? '—', date: e.fxDate ?? '—' })
                          : t('tf.fxFloating')}
                      >
                        {value === null ? '—' : formatMoney(value, base, { locale })}
                        {!locked && <span className="text-[#B5852F] ml-1" aria-hidden="true">~</span>}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        ))}
      </table>
    </div>
  )
}
