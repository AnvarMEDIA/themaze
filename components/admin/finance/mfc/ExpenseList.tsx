'use client'

import { useMemo } from 'react'
import { formatMoney, txBase } from '@/lib/finance/money'
import { chipColor } from '@/lib/mfc/palette'
import type { Currency, FinanceSettings } from '@/lib/finance/types'
import type { MfcCategory, MfcExpense } from '@/lib/mfc/types'
import { useFinanceLang } from '../lang'
import { catLabel, friendlyDate } from './shared'

/**
 * The ledger, grouped by day with a subtotal per day.
 *
 * The day subtotal is the point: a list of individual amounts answers "what
 * did I buy", but "Tuesday: 340 000" is the line that changes behaviour.
 *
 * Each row shows what was actually paid in its own currency, and the base
 * value underneath when the two differ — so a $12 lunch reads as $12, not as
 * a som figure the person never saw.
 */
export function ExpenseList({
  expenses,
  categories,
  settings,
  onEdit,
  emptyTitle,
  emptyHint,
  stickyDays = false,
  showDayHeaders = true,
}: {
  expenses: MfcExpense[]
  categories: MfcCategory[]
  settings: FinanceSettings
  onEdit?: (e: MfcExpense) => void
  emptyTitle: string
  emptyHint: string
  /**
   * Off when the surrounding screen already names the day — the day-detail
   * sheet puts the date and the total in its own header, and repeating both
   * one line below reads as a mistake.
   */
  showDayHeaders?: boolean
  /**
   * Pin the day header while scrolling. Worth it on the full ledger, where a
   * day can run past a screen; wrong in the dashboard's short "recent" panel,
   * where the header simply detaches and rides over the first row.
   */
  stickyDays?: boolean
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

  const lastGroup = groups.length - 1

  return (
    // No `overflow-hidden` when the day headers stick.
    //
    // A clipping ancestor becomes the scroll container for anything sticky
    // inside it. The header's `top` offset is then measured against this card
    // rather than the window — and since the offset is larger than the card's
    // own scrollport, the header was pushed to the bottom of its section and
    // sat squarely on top of the first row it was meant to label. Without the
    // clip it sticks to the window, which is what it was asking for; the
    // corners are rounded on the pieces that actually paint a background.
    <div className={`rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] ${stickyDays ? '' : 'overflow-hidden'}`}>
      {groups.map((g, gi) => (
        <section key={g.date}>
          {showDayHeaders && <header
            className={`flex items-baseline justify-between gap-3 px-5 py-2 bg-[#0B0B0B]/95 backdrop-blur border-y border-[#161616] ${
              // Where the MFC tab strip ends once both nav bars are pinned —
              // measured, not guessed (see MfcNav for the two above it).
              stickyDays ? 'sticky top-[162px] lg:top-[106px] z-10' : ''
            } ${gi === 0 ? 'rounded-t-xl border-t-0' : ''}`}
          >
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6A6A6A]">
              {friendlyDate(g.date, locale, { today: t('mfc.today'), yesterday: t('mfc.yesterday') })}
            </span>
            <span className="text-[11px] text-[#8A8A8A] tabular-nums">
              {formatMoney(g.total, base, { locale })}
            </span>
          </header>}

          <ul>
            {g.rows.map((e, ri) => {
              const cat = e.categoryId ? byId.get(e.categoryId) : undefined
              const { value, locked } = txBase(e, settings)
              const foreign = e.currency !== base
              const Row = onEdit ? 'button' : 'div'
              // The very last row is the only one whose hover fill would
              // otherwise square off the card's bottom corners.
              const last = gi === lastGroup && ri === g.rows.length - 1
              return (
                <li key={e.id} className="border-b border-[#141414] last:border-b-0">
                  <Row
                    {...(onEdit ? { type: 'button' as const, onClick: () => onEdit(e) } : {})}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors duration-150 ${
                      onEdit ? 'hover:bg-[#111] active:scale-[0.995]' : ''
                    } ${last ? 'rounded-b-xl' : ''}`}
                  >
                    <span
                      className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[16px] leading-none"
                      style={{ background: cat ? `${chipColor(cat.colorSlot)}26` : '#1A1A1A' }}
                      aria-hidden="true"
                    >
                      {cat?.icon ?? '·'}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-white truncate">
                        {catLabel(cat, lang, t('mfc.uncategorised'))}
                      </p>
                      {/* The method leads and the note follows, rather than
                          the two taking turns on this line: written as
                          `note || method` the method vanished the moment a
                          row had a note, which is most of them, and there was
                          no way to see what was paid in cash. Leading also
                          puts it in the same place on every row, so the
                          column can be read straight down. */}
                      <p className="text-[11px] truncate">
                        <span className="text-[#7C7C7C]">{t(`method.${e.method}`)}</span>
                        {e.note && <span className="text-[#5F5F5F]"> · {e.note}</span>}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[13px] text-white tabular-nums font-medium">
                        {formatMoney(e.amount, e.currency, { locale })}
                      </p>
                      {foreign && (
                        <p
                          className="text-[10px] text-[#5A5A5A] tabular-nums"
                          title={locked
                            ? t('tf.fxLocked', { rate: e.fxRate ?? '—', date: e.fxDate ?? '—' })
                            : t('tf.fxFloating')}
                        >
                          {value === null ? '—' : formatMoney(value, base, { locale })}
                          {!locked && <span className="text-[#B5852F] ml-1" aria-hidden="true">~</span>}
                        </p>
                      )}
                    </div>
                  </Row>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
