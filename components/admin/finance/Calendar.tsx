'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatMoney } from '@/lib/finance/money'
import { monthGrid, shiftMonth, monthOfDate } from '@/lib/finance/calendar'
import type { CalendarDeadline, CalendarSchedule, MonthLedger } from '@/lib/finance/calendar'
import { todayLocal } from '@/lib/finance/date'
import { useFinanceLang } from './lang'
import { FIN_COLORS } from './tokens'

const WEEKDAY_KEYS = ['cal.mon', 'cal.tue', 'cal.wed', 'cal.thu', 'cal.fri', 'cal.sat', 'cal.sun']

/**
 * Month calendar for the dashboard.
 *
 * Each day carries its own bar pair rather than a single net figure: a day
 * that took 10M and spent 9M is a busy day, and a net of 1M would hide that.
 * Markers show what is *planned* — project deadlines and scheduled payments —
 * alongside what actually happened, which is the whole point of looking at a
 * month on a grid instead of in a list.
 */
export function Calendar({
  ledger, month, onMonthChange, loading = false,
}: {
  ledger: MonthLedger | null
  month: string
  onMonthChange: (month: string) => void
  loading?: boolean
}) {
  const { t, locale, month: monthName } = useFinanceLang()
  const [selected, setSelected] = useState<string | null>(null)
  const today = todayLocal()
  const thisMonth = monthOfDate()

  const cells = useMemo(() => monthGrid(month), [month])

  // Index the month's data by day so each cell is a map lookup, not a scan.
  const byDay = useMemo(
    () => new Map((ledger?.days ?? []).map((d) => [d.date, d])),
    [ledger],
  )
  const deadlinesByDay = useMemo(() => {
    const m = new Map<string, CalendarDeadline[]>()
    for (const d of ledger?.deadlines ?? []) m.set(d.date, [...(m.get(d.date) ?? []), d])
    return m
  }, [ledger])
  const scheduleByDay = useMemo(() => {
    const m = new Map<string, CalendarSchedule[]>()
    for (const s of ledger?.schedule ?? []) m.set(s.date, [...(m.get(s.date) ?? []), s])
    return m
  }, [ledger])

  // A shared scale across the month, so bar heights are comparable day to day.
  const peak = useMemo(
    () => Math.max(1, ...(ledger?.days ?? []).flatMap((d) => [d.income, d.expense])),
    [ledger],
  )

  const cur = ledger?.baseCurrency ?? 'UZS'
  const money = (v: number) => formatMoney(v, cur, { locale })
  const compact = (v: number) => formatMoney(v, cur, { compact: true, locale })

  const title = `${monthName(Number(month.slice(5, 7)) - 1)} ${month.slice(0, 4)}`

  const dayTxns = useMemo(
    () => (selected ? (ledger?.transactions ?? []).filter((x) => x.date.slice(0, 10) === selected) : []),
    [selected, ledger],
  )

  const go = (by: number) => { onMonthChange(shiftMonth(month, by)); setSelected(null) }

  return (
    <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-5 sm:p-6">
      {/* Header: month navigation + the month's totals */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 mb-5">
        <div className="flex items-center gap-1">
          <NavButton onClick={() => go(-1)} label={t('cal.prev')}>‹</NavButton>
          <span className="text-sm font-semibold text-white tabular-nums min-w-[7.5rem] text-center">{title}</span>
          <NavButton onClick={() => go(1)} label={t('cal.next')}>›</NavButton>
          {month !== thisMonth && (
            <button
              type="button"
              onClick={() => { onMonthChange(thisMonth); setSelected(null) }}
              className="ml-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-[#888] hover:text-white border border-[#252525] hover:border-[#333] transition-colors active:scale-[0.97]"
            >
              {t('cal.today')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-[12px] tabular-nums">
          <span className="text-[#8FC748]">{t('cal.in')} {compact(ledger?.income ?? 0)}</span>
          <span className="text-[#E27A5C]">{t('cal.out')} {compact(ledger?.expense ?? 0)}</span>
          <span className={`font-semibold ${(ledger?.net ?? 0) >= 0 ? 'text-white' : 'text-[#E27A5C]'}`}>
            {t('cal.net')} {compact(ledger?.net ?? 0)}
          </span>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_KEYS.map((k) => (
          <span key={k} className="text-[10px] uppercase tracking-wide text-[#4A4A4A] text-center py-1">
            {t(k)}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className={`grid grid-cols-7 gap-1 transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`}>
        {cells.map((cell) => {
          const day = byDay.get(cell.date)
          const deadlines = deadlinesByDay.get(cell.date) ?? []
          const scheduled = scheduleByDay.get(cell.date) ?? []
          const isToday = cell.date === today
          const isSelected = selected === cell.date
          const hasAnything = !!day || deadlines.length > 0 || scheduled.length > 0
          const dayNum = Number(cell.date.slice(8, 10))

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => setSelected(isSelected ? null : cell.date)}
              aria-pressed={isSelected}
              aria-label={cell.date}
              className={`relative h-[62px] sm:h-[72px] rounded-lg border p-1.5 flex flex-col text-left transition-colors active:scale-[0.97] ${
                isSelected
                  ? 'border-[#C8FF47]/60 bg-[#C8FF47]/[0.07]'
                  : hasAnything
                    ? 'border-[#232323] bg-[#111] hover:border-[#333]'
                    : 'border-[#161616] hover:border-[#232323]'
              } ${cell.inMonth ? '' : 'opacity-35'}`}
            >
              <span className={`text-[11px] tabular-nums leading-none ${
                isToday ? 'text-[#0A0A0A] bg-[#C8FF47] rounded px-1 py-0.5 font-bold self-start'
                : cell.inMonth ? 'text-[#999]' : 'text-[#555]'
              }`}>
                {dayNum}
              </span>

              {/* Day bars — income left, expense right, same order everywhere. */}
              {day && (
                <div className="flex items-end justify-start gap-[2px] h-full mt-1 pb-0.5">
                  <span
                    className="w-1.5 rounded-t-[2px]"
                    style={{ height: `${Math.max((day.income / peak) * 100, day.income > 0 ? 8 : 0)}%`, background: FIN_COLORS.income }}
                  />
                  <span
                    className="w-1.5 rounded-t-[2px]"
                    style={{ height: `${Math.max((day.expense / peak) * 100, day.expense > 0 ? 8 : 0)}%`, background: FIN_COLORS.expense }}
                  />
                </div>
              )}

              {/* Planned things, as dots in the corner. */}
              {(deadlines.length > 0 || scheduled.length > 0) && (
                <span className="absolute top-1.5 right-1.5 flex items-center gap-[3px]">
                  {deadlines.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#FFD447]" />}
                  {scheduled.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#3E92C8]" />}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 pt-4 border-t border-[#1A1A1A]">
        <Key color={FIN_COLORS.income} label={t('cal.legendIn')} />
        <Key color={FIN_COLORS.expense} label={t('cal.legendOut')} />
        <Key color="#FFD447" round label={t('cal.legendDeadline')} />
        <Key color="#3E92C8" round label={t('cal.legendScheduled')} />
      </div>

      {/* Day detail */}
      <div className="mt-4">
        {!selected ? (
          <p className="text-[12px] text-[#555]">{t('cal.selectHint')}</p>
        ) : (
          <DayPanel
            date={selected}
            transactions={dayTxns}
            deadlines={deadlinesByDay.get(selected) ?? []}
            scheduled={scheduleByDay.get(selected) ?? []}
            onClose={() => setSelected(null)}
            money={money}
          />
        )}
      </div>
    </div>
  )
}

function DayPanel({
  date, transactions, deadlines, scheduled, onClose, money,
}: {
  date: string
  transactions: MonthLedger['transactions']
  deadlines: MonthLedger['deadlines']
  scheduled: MonthLedger['schedule']
  onClose: () => void
  money: (v: number) => string
}) {
  const { t, locale } = useFinanceLang()
  const empty = transactions.length === 0 && deadlines.length === 0 && scheduled.length === 0

  return (
    <div className="rounded-lg border border-[#232323] bg-[#0B0B0B] p-4 fin-fade">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[13px] font-semibold text-white tabular-nums">{date}</p>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] text-[#666] hover:text-white transition-colors"
        >
          {t('cal.close')}
        </button>
      </div>

      {empty && <p className="text-[12px] text-[#555]">{t('cal.nothingDay')}</p>}

      {deadlines.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wide text-[#666] mb-1.5">{t('cal.deadlines')}</p>
          {deadlines.map((d) => (
            <div key={d.projectId} className="flex items-center gap-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFD447] flex-shrink-0" />
              <span className="text-[12px] text-white truncate">{d.title}</span>
              {d.client && <span className="text-[11px] text-[#666] truncate">{d.client}</span>}
              {d.outstanding > 0 && (
                <span className="text-[11px] text-[#FFD447] tabular-nums ml-auto whitespace-nowrap">
                  {t('cal.owed', { v: formatMoney(d.outstanding, d.currency, { locale }) })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {scheduled.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wide text-[#666] mb-1.5">{t('cal.scheduled')}</p>
          {scheduled.map((s, i) => (
            <div key={`${s.recurringId}-${i}`} className="flex items-center gap-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3E92C8] flex-shrink-0" />
              <span className="text-[12px] text-white truncate">{s.title}</span>
              {/* These are plans, not entries — say so, or the day looks paid. */}
              <span className="text-[11px] text-[#666] whitespace-nowrap">{t('cal.notRecorded')}</span>
              <span className={`text-[12px] tabular-nums ml-auto whitespace-nowrap ${s.type === 'income' ? 'text-[#8FC748]' : 'text-[#E27A5C]'}`}>
                {s.type === 'income' ? '+' : '−'}{formatMoney(s.amount, s.currency, { locale })}
              </span>
            </div>
          ))}
        </div>
      )}

      {transactions.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#666] mb-1.5">{t('cal.transactions')}</p>
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center gap-2 py-1">
              <span
                className="text-[11px] flex-shrink-0"
                style={{ color: tx.type === 'income' ? '#8FC748' : '#E27A5C' }}
                aria-hidden="true"
              >
                {tx.type === 'income' ? '↑' : '↓'}
              </span>
              <span className="text-[12px] text-white truncate">
                {tx.category || (tx.type === 'income' ? t('txn.payment') : t('txn.expense'))}
              </span>
              <span className={`text-[12px] tabular-nums ml-auto whitespace-nowrap ${tx.type === 'income' ? 'text-[#8FC748]' : 'text-[#E27A5C]'}`}>
                {tx.type === 'income' ? '+' : '−'}{formatMoney(tx.amount, tx.currency, { locale })}
              </span>
            </div>
          ))}
          <Link
            href="/admin/finance/transactions"
            className="inline-block mt-2 text-[11px] text-[#666] hover:text-[#C8FF47] transition-colors"
          >
            {t('cal.openLedger')}
          </Link>
        </div>
      )}
    </div>
  )
}

function NavButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#888] hover:text-white hover:bg-[#161616] transition-colors active:scale-[0.97] text-lg leading-none"
    >
      {children}
    </button>
  )
}

function Key({ color, label, round = false }: { color: string; label: string; round?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[#888]">
      <span className={`w-2.5 h-2.5 ${round ? 'rounded-full' : 'rounded-[3px]'}`} style={{ background: color }} />
      {label}
    </span>
  )
}
