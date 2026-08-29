'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatMoney, convert, DEFAULT_FINANCE_SETTINGS } from '@/lib/finance/money'
import type { Currency, FinanceClient, FinanceProject, FinanceSettings, FinanceTransaction, TransactionType } from '@/lib/finance/types'
import { inPeriod, resolvePeriod } from '@/lib/finance/period'
import { duplicateIds } from '@/lib/finance/duplicates'
import { payeeKey } from '@/lib/finance/expenseKind'
import { EXPENSE_KINDS } from '@/lib/finance/types'
import { TransactionForm } from '@/components/admin/finance/TransactionForm'
import { ClassifyExpenses } from '@/components/admin/finance/ClassifyExpenses'
import { useFinanceLang } from '@/components/admin/finance/lang'
import { PeriodPicker, periodQuery, type PeriodValue } from '@/components/admin/finance/PeriodPicker'

type Filter = 'all' | TransactionType

export default function TransactionsPage() {
  const router = useRouter()
  const { t, locale, tMethod, tKind } = useFinanceLang()
  const [txns, setTxns] = useState<FinanceTransaction[]>([])
  const [projects, setProjects] = useState<FinanceProject[]>([])
  const [clients, setClients] = useState<FinanceClient[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [period, setPeriod] = useState<PeriodValue>({ preset: 'all', from: '', to: '' })
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [query, setQuery] = useState('')
  const [onlyDupes, setOnlyDupes] = useState(false)
  const [kind, setKind] = useState('')
  const [payee, setPayee] = useState('')
  const [settings, setSettings] = useState<FinanceSettings>(DEFAULT_FINANCE_SETTINGS)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FinanceTransaction | null>(null)
  const [classifyOpen, setClassifyOpen] = useState(false)

  const load = useCallback(async () => {
    const [tRes, pRes, cRes, sRes] = await Promise.all([
      fetch('/api/finance/transactions', { cache: 'no-store' }),
      fetch('/api/finance/projects', { cache: 'no-store' }),
      fetch('/api/finance/clients', { cache: 'no-store' }),
      fetch('/api/finance/settings', { cache: 'no-store' }),
    ])
    if ([tRes, pRes, cRes, sRes].some((r) => r.status === 401)) { router.push('/admin/finance/unlock'); return }
    setTxns(await tRes.json())
    setProjects(await pRes.json())
    setClients(await cRes.json())
    // Effective rates, so the totals row matches the dashboard's conversion.
    const sj = (await sRes.json()) as { baseCurrency: Currency; effectiveRates?: Partial<Record<Currency, number>> }
    setSettings({ ...DEFAULT_FINANCE_SETTINGS, baseCurrency: sj.baseCurrency, rates: sj.effectiveRates ?? {} })
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search)
    if (qs.get('new')) openNew()
    // Arriving from a total on the Spending report: show exactly those rows.
    const k = qs.get('kind'); const pe = qs.get('payee')
    if (k) { setKind(k); setFilter('expense') }
    if (pe) { setPayee(pe); setFilter('expense') }
  }, [])

  const projName = useMemo(() => new Map(projects.map((p) => [p.id, p.title])), [projects])
  const cliName = useMemo(() => new Map(clients.map((c) => [c.id, c.company || c.name])), [clients])

  const openNew = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (tx: FinanceTransaction) => { setEditing(tx); setFormOpen(true) }

  const del = async (tx: FinanceTransaction): Promise<boolean> => {
    if (!window.confirm(t('txns.confirmDelete'))) return false
    const res = await fetch(`/api/finance/transactions/${tx.id}`, { method: 'DELETE' })
    if (res.status === 401) { router.push('/admin/finance/unlock'); return false }
    if (res.ok) { toast.success(t('toast.deleted')); setTxns((x) => x.filter((r) => r.id !== tx.id)); return true }
    toast.error(t('toast.deleteFail'))
    return false
  }

  // Delete from within the edit modal (used on mobile, where the row has no
  // inline action buttons).
  const delFromForm = async () => {
    if (editing && (await del(editing))) setFormOpen(false)
  }

  const filterLabel: Record<Filter, string> = {
    all: t('txns.filterAll'), income: t('txns.filterIncome'), expense: t('txns.filterExpense'),
  }

  const range = useMemo(
    () => (period.preset === 'custom'
      ? { from: period.from, to: period.to }
      : resolvePeriod(period.preset)),
    [period.preset, period.from, period.to],
  )

  // Computed over the WHOLE ledger, not the filtered view: a duplicate's twin
  // may well sit outside the current filter, and a pair that only shows up on
  // some filters would be worse than no flag at all.
  const dupes = useMemo(() => duplicateIds(txns), [txns])

  // Every payee the ledger knows, one entry per person however they were
  // spelled — the same normalisation the reports group on.
  const unsortedCount = useMemo(
    () => txns.filter((tx) => tx.type === 'expense' && !tx.expenseKind).length,
    [txns],
  )

  const payeeOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const tx of txns) {
      const name = tx.payee?.trim()
      if (!name) continue
      const k = payeeKey(name)
      if (!seen.has(k)) seen.set(k, name)
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [txns])

  const q = query.trim().toLowerCase()
  const rows = useMemo(() => txns.filter((tx) => {
    if (onlyDupes && !dupes.has(tx.id)) return false
    if (filter !== 'all' && tx.type !== filter) return false
    if ((range.from || range.to) && !inPeriod(tx.date, range)) return false
    if (clientId && tx.clientId !== clientId) return false
    if (projectId && tx.projectId !== projectId) return false
    // Kind and payee describe SPENDING, so both filters imply "expense" —
    // otherwise an income row carrying a stale kind shows up under Payroll.
    // 'unclassified' is a real choice, not the absence of one.
    if (kind && (tx.type !== 'expense' || (kind === 'unclassified' ? !!tx.expenseKind : tx.expenseKind !== kind))) return false
    if (payee && (tx.type !== 'expense' || payeeKey(tx.payee) !== payee)) return false
    if (q) {
      const hay = [
        tx.category, tx.note,
        tx.projectId ? projName.get(tx.projectId) ?? '' : '',
        tx.clientId ? cliName.get(tx.clientId) ?? '' : '',
      ].join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }), [txns, filter, range, clientId, projectId, q, projName, cliName, onlyDupes, dupes, kind, payee])

  // Totals for exactly what is on screen — an unconvertible amount is left out
  // rather than counted as zero, and flagged below.
  const totals = useMemo(() => {
    let inc = 0, out = 0
    const unconverted = new Set<Currency>()
    for (const tx of rows) {
      const v = convert(tx.amount, tx.currency, settings.baseCurrency, settings)
      if (v === null) { unconverted.add(tx.currency); continue }
      if (tx.type === 'income') inc += v; else out += v
    }
    return { inc, out, net: inc - out, unconverted: [...unconverted] }
  }, [rows, settings])

  const filtersActive = filter !== 'all' || period.preset !== 'all' || !!clientId || !!projectId || !!q || onlyDupes || !!kind || !!payee
  const clearFilters = () => {
    setFilter('all'); setPeriod({ preset: 'all', from: '', to: '' })
    setClientId(''); setProjectId(''); setQuery(''); setOnlyDupes(false)
    setKind(''); setPayee('')
  }

  const exportQuery = () => {
    const qs = new URLSearchParams(periodQuery(period))
    if (filter !== 'all') qs.set('type', filter)
    if (clientId) qs.set('clientId', clientId)
    if (projectId) qs.set('projectId', projectId)
    if (q) qs.set('q', query.trim())
    if (kind) qs.set('kind', kind)
    if (payee) qs.set('payee', payee)
    return qs.toString()
  }

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white tracking-tight">{t('txns.title')}</h1>
          <p className="text-sm text-[#555] mt-0.5">{t('txns.subtitle')}</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-sm font-bold hover:bg-[#F0EEE6] transition-colors active:scale-[0.97] whitespace-nowrap flex-shrink-0">
          <span className="text-base leading-none">+</span> {t('txns.record')}
        </button>
      </div>

      {/* Expenses that have never been given a kind. Offered, not nagged: it
          disappears the moment there is nothing left to sort. */}
      {unsortedCount > 0 && (
        <div className="mb-4 rounded-xl border border-[#FFD447]/25 bg-[#FFD447]/[0.05] px-5 py-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[#FFD447]">{t('cls.banner', { n: unsortedCount })}</p>
            <p className="text-[12px] text-[#8a8272] mt-0.5">{t('cls.bannerHint')}</p>
          </div>
          <button
            onClick={() => setClassifyOpen(true)}
            className="px-3 py-2 rounded-lg bg-[#FFD447] text-[#0A0A0A] text-[13px] font-bold hover:bg-[#F0EEE6] transition-colors active:scale-[0.97] whitespace-nowrap"
          >
            {t('cls.review')}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            {(['all', 'income', 'expense'] as Filter[]).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium capitalize transition-colors ${
                  filter === k ? 'bg-[#161616] text-white border border-[#2A2A2A]' : 'text-[#777] hover:text-white border border-transparent'
                }`}
              >
                {filterLabel[k]}
              </button>
            ))}
          </div>
          <PeriodPicker value={period} onChange={setPeriod} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('txns.search')}
            className="flex-1 min-w-[200px] bg-[#111] border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-[#EDEBE3] placeholder:text-[#4A4A4A] focus:outline-none focus:border-[#C8FF47] transition-colors"
          />
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="bg-[#111] border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-[#EDEBE3] focus:outline-none focus:border-[#C8FF47] transition-colors cursor-pointer"
          >
            <option value="">{t('txns.filterClient')}</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
          </select>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="bg-[#111] border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-[#EDEBE3] focus:outline-none focus:border-[#C8FF47] transition-colors cursor-pointer max-w-[220px]"
          >
            <option value="">{t('txns.filterProject')}</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          {/* Expense-only axes. Hidden while looking at income, where they
              would filter everything away and read as a broken screen. */}
          {filter !== 'income' && (
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="bg-[#111] border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-[#EDEBE3] focus:outline-none focus:border-[#C8FF47] transition-colors cursor-pointer"
            >
              <option value="">{t('exp.filterKind')}</option>
              {EXPENSE_KINDS.map((k) => <option key={k} value={k}>{tKind(k)}</option>)}
              <option value="unclassified">{t('exp.unclassified')}</option>
            </select>
          )}
          {filter !== 'income' && payeeOptions.length > 0 && (
            <select
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              className="bg-[#111] border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-[#EDEBE3] focus:outline-none focus:border-[#C8FF47] transition-colors cursor-pointer max-w-[200px]"
            >
              <option value="">{t('exp.filterPayee')}</option>
              {payeeOptions.map(([k, name]) => <option key={k} value={k}>{name}</option>)}
            </select>
          )}

          {/* Only offered when there is something to find — a chip that always
              says zero is noise. */}
          {dupes.size > 0 && (
            <button
              onClick={() => setOnlyDupes((v) => !v)}
              aria-pressed={onlyDupes}
              title={t('dup.hint')}
              className={`px-3 py-2 rounded-lg text-[13px] font-medium transition-colors active:scale-[0.97] border ${
                onlyDupes
                  ? 'border-[#FFD447]/50 bg-[#FFD447]/10 text-[#FFD447]'
                  : 'border-[#252525] text-[#888] hover:text-white hover:border-[#333]'
              }`}
            >
              {t('dup.found', { n: dupes.size })}
            </button>
          )}
          {filtersActive && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 rounded-lg text-[13px] text-[#888] hover:text-white border border-[#252525] hover:border-[#333] transition-colors active:scale-[0.97]"
            >
              {t('txns.clearFilters')}
            </button>
          )}
          <a
            href={`/api/finance/export?${exportQuery()}`}
            className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2A2A2A] bg-[#161616] text-[13px] font-medium text-[#bbb] hover:text-white hover:border-[#333] transition-colors active:scale-[0.97]"
          >
            {t('txns.export')}
          </a>
        </div>

        {/* Totals for the current view — the number that actually answers
            "how much did this client pay us in Q2". */}
        {!loading && rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 rounded-lg bg-[#0D0D0D] border border-[#1E1E1E]">
            <span className="text-[11px] text-[#555]">{t('txns.showing', { n: rows.length, total: txns.length })}</span>
            <span className="text-[13px] tabular-nums text-[#8FC748]">
              {t('txns.sumIn')}: {formatMoney(totals.inc, settings.baseCurrency, { locale })}
            </span>
            <span className="text-[13px] tabular-nums text-[#E27A5C]">
              {t('txns.sumOut')}: {formatMoney(totals.out, settings.baseCurrency, { locale })}
            </span>
            <span className={`text-[13px] tabular-nums font-semibold ${totals.net >= 0 ? 'text-white' : 'text-[#E27A5C]'}`}>
              {t('txns.sumNet')}: {formatMoney(totals.net, settings.baseCurrency, { locale })}
            </span>
            {totals.unconverted.length > 0 && (
              <span className="text-[11px] text-[#FFD447]">
                {t('projs.unconverted', { list: totals.unconverted.join(', ') })}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded bg-[#141414] animate-pulse" />)}</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-[#666] mb-3">{filtersActive ? t('txns.emptyFiltered', { f: filterLabel[filter] }) : t('txns.emptyAll')}</p>
            <button onClick={openNew} className="text-sm text-[#C8FF47] hover:underline">{t('txns.recordFirst')}</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[#555] border-b border-[#1A1A1A]">
                <th className="font-medium px-3 sm:px-5 py-3 hidden sm:table-cell">{t('txns.colDate')}</th>
                <th className="font-medium px-3 py-3">{t('txns.colCategory')}</th>
                <th className="font-medium px-3 py-3 hidden md:table-cell">{t('txns.colProject')}</th>
                <th className="font-medium px-3 py-3 hidden lg:table-cell">{t('txns.colClient')}</th>
                <th className="font-medium px-3 py-3 hidden sm:table-cell">{t('txns.colMethod')}</th>
                <th className="font-medium px-3 py-3 text-right">{t('txns.colAmount')}</th>
                <th className="px-3 sm:px-5 py-3 hidden sm:table-cell" />
              </tr>
            </thead>
            <tbody>
              {rows.map((tx) => (
                <tr key={tx.id} onClick={() => openEdit(tx)} className="border-b border-[#151515] last:border-b-0 hover:bg-[#111] transition-colors group cursor-pointer">
                  <td className="px-3 sm:px-5 py-3 text-[#999] tabular-nums whitespace-nowrap hidden sm:table-cell">{tx.date}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs flex-shrink-0" style={{ color: tx.type === 'income' ? '#8FC748' : '#E27A5C' }} aria-hidden="true">
                        {/* Up for money in, down for money out — matches the
                            sign and colour on the amount, and the dashboard. */}
                        {tx.type === 'income' ? '↑' : '↓'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-white truncate sm:max-w-[220px]">
                          {tx.category || (tx.type === 'income' ? t('txn.payment') : t('txn.expense'))}
                        </p>
                        {/* Date moves under the category on mobile (its own column is hidden). */}
                        <p className="text-[11px] text-[#666] tabular-nums sm:hidden">{tx.date}</p>
                        {/* A flag, never a verdict: an identical payment days
                            apart can be perfectly real. */}
                        {dupes.has(tx.id) && (
                          <span className="inline-block mt-0.5 text-[10px] font-medium text-[#FFD447] bg-[#FFD447]/10 border border-[#FFD447]/25 rounded px-1.5 py-0.5">
                            {t('dup.badge')}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[#888] hidden md:table-cell truncate max-w-[160px]">{tx.projectId ? projName.get(tx.projectId) ?? '—' : '—'}</td>
                  <td className="px-3 py-3 text-[#888] hidden lg:table-cell truncate max-w-[140px]">{tx.clientId ? cliName.get(tx.clientId) ?? '—' : '—'}</td>
                  <td className="px-3 py-3 text-[#777] hidden sm:table-cell">{tMethod(tx.method)}</td>
                  <td className="px-3 py-3 text-right tabular-nums font-medium whitespace-nowrap" style={{ color: tx.type === 'income' ? '#8FC748' : '#E27A5C' }}>
                    {tx.type === 'income' ? '+' : '−'}{formatMoney(tx.amount, tx.currency, { locale })}
                  </td>
                  <td className="px-3 sm:px-5 py-3 text-right whitespace-nowrap hidden sm:table-cell">
                    <span className="transition-opacity [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100">
                      <button onClick={(e) => { e.stopPropagation(); openEdit(tx) }} className="text-xs text-[#888] hover:text-[#C8FF47] mr-3">{t('common.edit')}</button>
                      <button onClick={(e) => { e.stopPropagation(); del(tx) }} className="text-xs text-[#888] hover:text-red-400">{t('common.delete')}</button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <ClassifyExpenses
        open={classifyOpen}
        onClose={() => setClassifyOpen(false)}
        onDone={load}
      />

      <TransactionForm
        open={formOpen}
        initial={editing}
        projects={projects}
        clients={clients}
        payees={payeeOptions.map(([, name]) => name)}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        onDelete={delFromForm}
      />
    </div>
  )
}
