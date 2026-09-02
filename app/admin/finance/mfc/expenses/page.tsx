'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatMoney, txBase } from '@/lib/finance/money'
import { inPeriod } from '@/lib/finance/period'
import type { Currency, FinanceSettings } from '@/lib/finance/types'
import type { MfcCategory, MfcExpense } from '@/lib/mfc/types'
import { useFinanceLang } from '@/components/admin/finance/lang'
import { PeriodPicker, type PeriodValue } from '@/components/admin/finance/PeriodPicker'
import { AddButton } from '@/components/admin/finance/mfc/MfcNav'
import { QuickAdd } from '@/components/admin/finance/mfc/QuickAdd'
import { ExpenseList } from '@/components/admin/finance/mfc/ExpenseList'
import { catLabel, resolveWindow, windowQuery } from '@/components/admin/finance/mfc/shared'

const PERIOD_KEY = 'maze_mfc_period'
const DEFAULT_PERIOD: PeriodValue = { preset: 'month', from: '', to: '' }

interface Ledger {
  expenses: MfcExpense[]
  categories: MfcCategory[]
  baseCurrency: Currency
  rates: Partial<Record<Currency, number>>
}

export default function MfcExpensesPage() {
  const router = useRouter()
  const { t, lang, locale } = useFinanceLang()
  const [data, setData] = useState<Ledger | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD)
  const [ready, setReady] = useState(false)
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<MfcExpense | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PERIOD_KEY)
      if (raw) {
        const p = JSON.parse(raw) as PeriodValue
        if (p?.preset) setPeriod({ preset: p.preset, from: p.from ?? '', to: p.to ?? '' })
      }
    } catch { /* ignore */ }
    setReady(true)
  }, [])

  const load = useCallback(async () => {
    const res = await fetch('/api/finance/mfc/ledger', { cache: 'no-store' })
    if (res.status === 401) { router.push('/admin/finance/unlock'); return }
    setData(await res.json())
    setLoading(false)
  }, [router])

  useEffect(() => { if (ready) load() }, [ready, load])

  const remove = useCallback(async (e: MfcExpense) => {
    const res = await fetch(`/api/finance/mfc/expenses/${e.id}`, { method: 'DELETE' })
    if (res.status === 401) { router.push('/admin/finance/unlock'); return }
    if (!res.ok) { toast.error(t('toast.deleteFail')); return }
    toast.success(t('mfc.deleted'))
    setAdding(false)
    setEditing(null)
    await load()
  }, [router, t, load])

  const changePeriod = (p: PeriodValue) => {
    setPeriod(p)
    try { window.localStorage.setItem(PERIOD_KEY, JSON.stringify(p)) } catch { /* ignore */ }
  }

  const settings: FinanceSettings | null = useMemo(
    () => (data ? { baseCurrency: data.baseCurrency, rates: data.rates, autoRates: false, updatedAt: '' } : null),
    [data],
  )

  // The picker only says WHICH preset is on; its from/to stay empty, and an
  // empty bound means "unbounded" to inPeriod — so filtering on it directly
  // let every preset list the whole ledger, and the screen disagreed with the
  // dashboard beside it.
  const range = useMemo(() => resolveWindow(period), [period])

  // Filtering is done here rather than server-side: the whole ledger is a
  // personal one, it is already loaded, and typing that filters without a
  // round trip is the difference between usable and not on a phone.
  const filtered = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    const byId = new Map(data.categories.map((c) => [c.id, c]))
    return data.expenses.filter((e) => {
      if (!inPeriod(e.date, range)) return false
      if (category === 'none' ? e.categoryId !== null : category && e.categoryId !== category) return false
      if (!q) return true
      const c = e.categoryId ? byId.get(e.categoryId) : undefined
      return `${c?.name ?? ''} ${c?.nameRu ?? ''} ${e.note} ${e.amount}`.toLowerCase().includes(q)
    })
  }, [data, range, category, query])

  const total = useMemo(
    () => (settings ? filtered.reduce((s, e) => s + (txBase(e, settings).value ?? 0), 0) : 0),
    [filtered, settings],
  )

  if (loading || !data || !settings) {
    return (
      <div className="px-4 sm:px-6 py-6 max-w-[1000px] mx-auto">
        <div className="h-8 w-40 bg-[#141414] rounded animate-pulse mb-6" />
        <div className="h-96 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] animate-pulse" />
      </div>
    )
  }

  const cur = data.baseCurrency
  // Same resolved window the list is showing, so the file matches the screen.
  const exportQuery = new URLSearchParams(windowQuery(range))
  if (category) exportQuery.set('category', category)
  if (query.trim()) exportQuery.set('q', query.trim())

  return (
    <div className="px-4 sm:px-6 py-6 pb-24 sm:pb-10 max-w-[1000px] mx-auto">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{t('mfc.allExpenses')}</h1>
          <p className="text-sm text-[#555] mt-1">
            {t('mfc.showing', { n: filtered.length, total: data.expenses.length })} ·{' '}
            <span className="text-[#8FC748] tabular-nums">{formatMoney(total, cur, { locale })}</span>
          </p>
        </div>
        <AddButton onClick={() => { setEditing(null); setAdding(true) }} />
      </div>

      <div className="space-y-2.5 mb-5">
        <PeriodPicker value={period} onChange={changePeriod} />

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('mfc.search')}
            className="flex-1 min-w-[180px] bg-[#111] border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-[#EDEBE3] placeholder:text-[#4A4A4A] focus:outline-none focus:border-[#C8FF47] transition-colors"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label={t('mfc.category')}
            className="bg-[#111] border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-[#EDEBE3] focus:outline-none focus:border-[#C8FF47] transition-colors appearance-none cursor-pointer"
          >
            <option value="" className="bg-[#111]">{t('mfc.filterAll')}</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#111]">
                {c.icon} {catLabel(c, lang, c.name)}
              </option>
            ))}
            <option value="none" className="bg-[#111]">{t('mfc.uncategorised')}</option>
          </select>
          <a
            href={`/api/finance/mfc/export?${exportQuery.toString()}`}
            className="px-3 py-2 rounded-lg border border-[#2A2A2A] bg-[#161616] text-[13px] font-medium text-[#bbb] hover:text-white hover:border-[#333] transition-colors active:scale-[0.97]"
          >
            {t('mfc.export')}
          </a>
        </div>
      </div>

      <ExpenseList
        expenses={filtered}
        categories={data.categories}
        settings={settings}
        stickyDays
        onEdit={(e) => { setEditing(e); setAdding(true) }}
        emptyTitle={data.expenses.length === 0 ? t('mfc.empty') : t('mfc.emptyPeriod')}
        emptyHint={data.expenses.length === 0 ? t('mfc.emptyHint') : t('mfc.emptyPeriodHint')}
      />

      <QuickAdd
        open={adding}
        onClose={() => { setAdding(false); setEditing(null) }}
        categories={data.categories}
        baseCurrency={cur}
        editing={editing}
        onSaved={load}
        onDelete={remove}
      />
    </div>
  )
}
