'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { CURRENCIES, PAYMENT_METHODS, type Currency, type PaymentMethod } from '@/lib/finance/types'
import { CURRENCY_META, formatMoney } from '@/lib/finance/money'
import { chipColor } from '@/lib/mfc/palette'
import type { MfcCategory, MfcExpense } from '@/lib/mfc/types'
import { useFinanceLang } from '../lang'
import { activeCategories, catLabel, friendlyDate, todayIso, yesterdayIso } from './shared'

/**
 * The entry screen — the one thing that has to be fast, because it is used
 * several times a day and every other feature depends on it being used.
 *
 * Its own keypad rather than a text input: on a phone a numeric field brings
 * up the OS keyboard, which covers the category grid and turns a two-tap
 * action into scrolling. Here the amount, the categories and the save button
 * are on screen together the whole time. On a desktop the physical keyboard
 * still works — digits type, Backspace deletes, Enter saves, Esc closes.
 *
 * Enters as a bottom sheet on a phone (where thumbs are) and a centred modal
 * on a desktop, from scale(.97)/translateY, ease-out, ≤300ms.
 */
export function QuickAdd({
  open,
  onClose,
  categories,
  baseCurrency,
  editing,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  categories: MfcCategory[]
  baseCurrency: Currency
  /** Present when editing an existing row rather than adding a new one. */
  editing?: MfcExpense | null
  onSaved: () => void
}) {
  const { t, lang, locale } = useFinanceLang()

  const [digits, setDigits] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [currency, setCurrency] = useState<Currency>(baseCurrency)
  const [date, setDate] = useState(todayIso())
  const [note, setNote] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [busy, setBusy] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const pickable = useMemo(() => activeCategories(categories), [categories])
  const decimals = CURRENCY_META[currency].decimals

  /** The keypad builds a digit string; the value is that string as money. */
  const amount = useMemo(() => {
    if (!digits) return 0
    const n = Number(digits)
    return Number.isFinite(n) ? n : 0
  }, [digits])

  const reset = useCallback((keepContext: boolean) => {
    setDigits('')
    setNote('')
    if (!keepContext) {
      setCategoryId(null)
      setCurrency(baseCurrency)
      setDate(todayIso())
      setMethod('cash')
      setShowDetail(false)
    }
  }, [baseCurrency])

  // Re-seed whenever the sheet opens, so a half-typed amount from last time
  // never becomes a wrong entry this time.
  useEffect(() => {
    if (!open) return
    if (editing) {
      setDigits(String(editing.amount))
      setCategoryId(editing.categoryId)
      setCurrency(editing.currency)
      setDate(editing.date)
      setNote(editing.note)
      setMethod(editing.method)
      setShowDetail(Boolean(editing.note) || editing.date !== todayIso())
    } else {
      setDigits('')
      setCategoryId(null)
      setCurrency(baseCurrency)
      setDate(todayIso())
      setNote('')
      setMethod('cash')
      setShowDetail(false)
    }
  }, [open, editing, baseCurrency])

  const press = useCallback((key: string) => {
    setDigits((cur) => {
      if (key === 'back') return cur.slice(0, -1)
      if (key === '.') {
        if (decimals === 0 || cur.includes('.')) return cur
        return cur === '' ? '0.' : `${cur}.`
      }
      // A currency with no minor unit takes no fractions; one with them takes
      // two, so a slipped finger can't record 12.3456.
      const [, frac = ''] = cur.split('.')
      if (cur.includes('.') && frac.length >= decimals) return cur
      if (cur.replace('.', '').length >= 15) return cur
      if (cur === '0' && key !== '.') return key
      return cur + key
    })
  }, [decimals])

  const save = useCallback(async (again: boolean) => {
    if (amount <= 0) { toast.error(t('mfc.needAmount')); return }
    if (!categoryId) { toast.error(t('mfc.needCategory')); return }
    setBusy(true)
    try {
      const body = JSON.stringify({ categoryId, amount, currency, date, note, method })
      const res = await fetch(
        editing ? `/api/finance/mfc/expenses/${editing.id}` : '/api/finance/mfc/expenses',
        { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body },
      )
      if (!res.ok) throw new Error('save failed')
      toast.success(t('mfc.saved'))
      onSaved()
      // "Save and add another" keeps the category, currency and date: entering
      // a day's receipts is a run of similar rows, not unrelated ones.
      if (again && !editing) reset(true)
      else onClose()
    } catch {
      toast.error(t('toast.saveFail'))
    } finally {
      setBusy(false)
    }
  }, [amount, categoryId, currency, date, note, method, editing, onSaved, onClose, reset, t])

  // Physical keyboard. Ignored while a text field has focus, so typing "5" in
  // the note doesn't also add a digit to the amount.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
      if (e.key === 'Escape') { onClose(); return }
      if (typing) return
      if (/^[0-9]$/.test(e.key)) { press(e.key); e.preventDefault() }
      else if (e.key === '.' || e.key === ',') { press('.'); e.preventDefault() }
      else if (e.key === 'Backspace') { press('back'); e.preventDefault() }
      else if (e.key === 'Enter') { save(false); e.preventDefault() }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose, press, save])

  if (!open) return null

  const selected = pickable.find((c) => c.id === categoryId)
  const ready = amount > 0 && Boolean(categoryId)

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={editing ? t('mfc.edit') : t('mfc.add')}
    >
      <div className="fixed inset-0 bg-black/75 fin-fade" onClick={onClose} />

      <div
        ref={panelRef}
        className="relative w-full sm:max-w-md max-h-[92vh] sm:max-h-[88vh] overflow-y-auto overscroll-contain
                   rounded-t-3xl sm:rounded-2xl bg-[#0D0D0D] border-t sm:border border-[#232323] shadow-2xl mfc-sheet"
      >
        {/* Grab handle — the affordance that says "this pulls down" on a phone */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <span className="w-10 h-1 rounded-full bg-[#2E2E2E]" />
        </div>

        {/* Amount */}
        <div className="px-5 pt-3 sm:pt-5 pb-4 border-b border-[#1A1A1A]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#5A5A5A] mb-1.5">
                {editing ? t('mfc.edit') : t('mfc.amount')}
              </p>
              <p
                className="text-[34px] leading-none font-bold text-white tabular-nums truncate"
                aria-live="polite"
              >
                {digits || '0'}
                <span className="text-[#3A3A3A] text-[20px] ml-2 align-middle">
                  {currency === 'UZS' ? (lang === 'ru' ? 'сум' : 'so’m') : CURRENCY_META[currency].symbol}
                </span>
              </p>
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

          {/* Currency — only worth showing when more than the base is in play */}
          <div className="flex items-center gap-1 mt-3">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                aria-pressed={currency === c}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide transition-colors active:scale-[0.97] ${
                  currency === c ? 'bg-[#C8FF47]/12 text-[#C8FF47]' : 'text-[#666] hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="px-5 py-4 border-b border-[#1A1A1A]">
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#5A5A5A] mb-3">
            {t('mfc.category')}
          </p>
          {pickable.length === 0 ? (
            <p className="text-[13px] text-[#666]">{t('mfc.pickCategory')}</p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
              {pickable.map((c) => {
                const on = c.id === categoryId
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(on ? null : c.id)}
                    aria-pressed={on}
                    className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border transition-colors duration-150 active:scale-[0.97] ${
                      on
                        ? 'border-[#C8FF47]/50 bg-[#C8FF47]/[0.07]'
                        : 'border-transparent hover:bg-[#151515]'
                    }`}
                  >
                    <span
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[17px] leading-none"
                      style={{ background: `${chipColor(c.colorSlot)}26` }}
                      aria-hidden="true"
                    >
                      {c.icon}
                    </span>
                    <span className={`text-[10px] leading-tight text-center line-clamp-2 ${on ? 'text-[#C8FF47]' : 'text-[#8A8A8A]'}`}>
                      {catLabel(c, lang, '—')}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Optional detail — folded away so the common case stays two taps */}
        <div className="px-5 py-3 border-b border-[#1A1A1A]">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: todayIso(), label: t('mfc.today') },
              { key: yesterdayIso(), label: t('mfc.yesterday') },
            ].map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDate(d.key)}
                aria-pressed={date === d.key}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors active:scale-[0.97] ${
                  date === d.key ? 'bg-[#C8FF47]/12 text-[#C8FF47]' : 'text-[#777] hover:text-white hover:bg-[#161616]'
                }`}
              >
                {d.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowDetail((v) => !v)}
              aria-expanded={showDetail}
              className={`ml-auto px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors active:scale-[0.97] ${
                showDetail ? 'text-[#C8FF47]' : 'text-[#777] hover:text-white hover:bg-[#161616]'
              }`}
            >
              {date !== todayIso() && date !== yesterdayIso()
                ? friendlyDate(date, locale, { today: t('mfc.today'), yesterday: t('mfc.yesterday') })
                : t('mfc.note')}
              <span className="ml-1.5 inline-block transition-transform duration-200" style={{ transform: showDetail ? 'rotate(45deg)' : 'none' }}>+</span>
            </button>
          </div>

          {showDetail && (
            <div className="mt-3 space-y-2.5 fin-fade">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                placeholder={t('mfc.notePlaceholder')}
                className="w-full bg-[#111] border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-[#EDEBE3] placeholder:text-[#4A4A4A] focus:outline-none focus:border-[#C8FF47] transition-colors"
              />
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  aria-label={t('mfc.date')}
                  className="flex-1 bg-[#111] border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-[#EDEBE3] focus:outline-none focus:border-[#C8FF47] transition-colors"
                />
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  aria-label={t('mfc.method')}
                  className="flex-1 bg-[#111] border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-[#EDEBE3] focus:outline-none focus:border-[#C8FF47] transition-colors appearance-none cursor-pointer"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m} className="bg-[#111]">{t(`method.${m}`)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Keypad + save */}
        <div className="px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-3 gap-1.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => press(k)}
                disabled={k === '.' && decimals === 0}
                aria-label={k === 'back' ? t('mfc.backspace') : k}
                className="h-12 rounded-xl bg-[#141414] text-[19px] font-semibold text-[#EDEBE3] tabular-nums
                           transition-colors duration-100 hover:bg-[#1B1B1B] active:scale-[0.97]
                           disabled:opacity-25 disabled:pointer-events-none flex items-center justify-center"
              >
                {k === 'back' ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M7 4h9a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0116 16H7L2.5 10 7 4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M9.5 8l4 4M13.5 8l-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                ) : k}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => save(false)}
            disabled={!ready || busy}
            className="w-full mt-3 h-12 rounded-xl bg-[#C8FF47] text-[#0A0A0A] text-[15px] font-bold
                       transition-colors duration-150 hover:bg-[#D6FF6E] active:scale-[0.98]
                       disabled:bg-[#1A1A1A] disabled:text-[#4A4A4A] disabled:active:scale-100"
          >
            {busy
              ? t('common.saving')
              : ready
                ? `${t('mfc.save')} · ${formatMoney(amount, currency, { locale })}${selected ? ` · ${selected.icon}` : ''}`
                : amount > 0 ? t('mfc.needCategory') : t('mfc.needAmount')}
          </button>

          {!editing && (
            <button
              type="button"
              onClick={() => save(true)}
              disabled={!ready || busy}
              className="w-full mt-2 h-10 rounded-xl text-[13px] font-medium text-[#888]
                         transition-colors duration-150 hover:text-white hover:bg-[#161616]
                         active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
            >
              {t('mfc.saveAndNext')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
