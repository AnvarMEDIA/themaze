'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from './Modal'
import { formatMoney } from '@/lib/finance/money'
import { EXPENSE_KINDS, type Currency, type ExpenseKind } from '@/lib/finance/types'
import { useFinanceLang } from './lang'

interface Row {
  id: string
  date: string
  amount: number
  currency: Currency
  category: string
  note: string
  suggestedKind: ExpenseKind
  suggestedPayee: string
  reason: 'keyword' | 'known-payee' | 'name-like' | 'none'
}

const REASON_KEY: Record<Row['reason'], string> = {
  keyword: 'cls.reasonKeyword',
  'known-payee': 'cls.reasonKnown',
  'name-like': 'cls.reasonName',
  none: 'cls.reasonNone',
}

/**
 * Sorting the back catalogue of expenses into the new taxonomy.
 *
 * Every row is shown with the suggestion and the reason behind it, editable,
 * and ticked one by one. A keyword guess is not allowed to become a stored
 * fact without someone looking at it — these are the books.
 */
export function ClassifyExpenses({
  open, onClose, onDone,
}: {
  open: boolean
  onClose: () => void
  onDone: () => void
}) {
  const { t, locale, tKind } = useFinanceLang()
  const [rows, setRows] = useState<Row[]>([])
  const [chosen, setChosen] = useState<Record<string, { kind: ExpenseKind; payee: string; on: boolean }>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/finance/expenses/classify', { cache: 'no-store' })
    if (!res.ok) { setLoading(false); return }
    const data = (await res.json()) as { rows: Row[] }
    setRows(data.rows)
    setChosen(Object.fromEntries(data.rows.map((r) => [
      r.id,
      // A row the classifier could make nothing of starts unticked: there is
      // no suggestion to accept, only a default that would be noise.
      { kind: r.suggestedKind, payee: r.suggestedPayee, on: r.reason !== 'none' },
    ])))
    setLoading(false)
  }, [])

  useEffect(() => { if (open) load() }, [open, load])

  const selected = useMemo(() => rows.filter((r) => chosen[r.id]?.on), [rows, chosen])

  const setAll = (on: boolean) =>
    setChosen((c) => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, { ...v, on }])))

  const apply = async () => {
    if (selected.length === 0) return
    setBusy(true)
    try {
      const res = await fetch('/api/finance/expenses/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: selected.map((r) => ({
            id: r.id,
            expenseKind: chosen[r.id].kind,
            payee: chosen[r.id].payee.trim() || undefined,
          })),
        }),
      })
      if (res.status === 401) { window.location.href = '/admin/finance/unlock'; return }
      if (!res.ok) { toast.error(t('cls.applyFail')); return }
      const data = (await res.json()) as { applied: number }
      toast.success(t('cls.applied', { n: data.applied }))
      onDone()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('cls.title')}>
      <p className="text-[12px] text-[#666] leading-relaxed mb-4">{t('cls.intro')}</p>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-[#111] animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#555]">{t('cls.nothing')}</p>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <button type="button" onClick={() => setAll(true)} className="text-[11px] text-[#888] hover:text-white px-2 py-1 rounded border border-[#252525]">{t('cls.selectAll')}</button>
            <button type="button" onClick={() => setAll(false)} className="text-[11px] text-[#888] hover:text-white px-2 py-1 rounded border border-[#252525]">{t('cls.selectNone')}</button>
            <span className="ml-auto text-[11px] text-[#555] tabular-nums">{selected.length} / {rows.length}</span>
          </div>

          <div className="max-h-[46vh] overflow-y-auto space-y-1.5 pr-1 -mr-1">
            {rows.map((r) => {
              const c = chosen[r.id]
              if (!c) return null
              return (
                <div key={r.id} className={`rounded-lg border p-2.5 transition-colors ${c.on ? 'border-[#252525] bg-[#0B0B0B]' : 'border-[#161616] bg-transparent opacity-60'}`}>
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={c.on}
                      onChange={(e) => setChosen((s) => ({ ...s, [r.id]: { ...c, on: e.target.checked } }))}
                      aria-label={r.category || r.id}
                      className="mt-1 w-4 h-4 rounded accent-[#C8FF47] cursor-pointer flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[13px] text-white truncate">{r.category || t('txn.expense')}</span>
                        <span className="text-[12px] text-[#E27A5C] tabular-nums whitespace-nowrap">
                          {formatMoney(r.amount, r.currency, { locale })}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#666] tabular-nums">
                        {r.date} · {t(REASON_KEY[r.reason])}
                      </p>

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <select
                          value={c.kind}
                          onChange={(e) => setChosen((s) => ({ ...s, [r.id]: { ...c, kind: e.target.value as ExpenseKind } }))}
                          className="bg-[#111] border border-[#252525] rounded-md px-2 py-1.5 text-[12px] text-[#EDEBE3] focus:outline-none focus:border-[#C8FF47] cursor-pointer"
                        >
                          {EXPENSE_KINDS.map((k) => <option key={k} value={k}>{tKind(k)}</option>)}
                        </select>
                        <input
                          value={c.payee}
                          onChange={(e) => setChosen((s) => ({ ...s, [r.id]: { ...c, payee: e.target.value } }))}
                          placeholder={t('tf.payeePlaceholder')}
                          maxLength={120}
                          className="bg-[#111] border border-[#252525] rounded-md px-2 py-1.5 text-[12px] text-[#EDEBE3] placeholder:text-[#4A4A4A] focus:outline-none focus:border-[#C8FF47]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-2 pt-4">
            <button type="button" onClick={onClose} className="ml-auto px-4 py-2.5 rounded-lg text-sm text-[#999] hover:text-white hover:bg-[#161616] transition-colors active:scale-[0.97]">
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={busy || selected.length === 0}
              className="px-5 py-2.5 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-sm font-bold hover:bg-[#F0EEE6] transition-colors disabled:opacity-50 active:scale-[0.97]"
            >
              {busy ? t('cls.applying') : t('cls.apply', { n: selected.length })}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
