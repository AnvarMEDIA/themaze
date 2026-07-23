'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatMoney } from '@/lib/finance/money'
import type { FinanceClient, FinanceProject, FinanceTransaction, TransactionType } from '@/lib/finance/types'
import { TransactionForm } from '@/components/admin/finance/TransactionForm'
import { useFinanceLang } from '@/components/admin/finance/lang'

type Filter = 'all' | TransactionType

export default function TransactionsPage() {
  const router = useRouter()
  const { t, locale, tMethod } = useFinanceLang()
  const [txns, setTxns] = useState<FinanceTransaction[]>([])
  const [projects, setProjects] = useState<FinanceProject[]>([])
  const [clients, setClients] = useState<FinanceClient[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FinanceTransaction | null>(null)

  const load = useCallback(async () => {
    const [tRes, pRes, cRes] = await Promise.all([
      fetch('/api/finance/transactions', { cache: 'no-store' }),
      fetch('/api/finance/projects', { cache: 'no-store' }),
      fetch('/api/finance/clients', { cache: 'no-store' }),
    ])
    if ([tRes, pRes, cRes].some((r) => r.status === 401)) { router.push('/admin/finance/unlock'); return }
    setTxns(await tRes.json())
    setProjects(await pRes.json())
    setClients(await cRes.json())
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (new URLSearchParams(window.location.search).get('new')) openNew() }, [])

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

  const rows = filter === 'all' ? txns : txns.filter((tx) => tx.type === filter)
  const filterLabel: Record<Filter, string> = {
    all: t('txns.filterAll'), income: t('txns.filterIncome'), expense: t('txns.filterExpense'),
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

      {/* Filter */}
      <div className="flex items-center gap-1 mb-4">
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

      <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded bg-[#141414] animate-pulse" />)}</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-[#666] mb-3">{filter !== 'all' ? t('txns.emptyFiltered', { f: filterLabel[filter] }) : t('txns.emptyAll')}</p>
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
                        {tx.type === 'income' ? '↓' : '↑'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-white truncate sm:max-w-[220px]">{tx.category || (tx.type === 'income' ? t('txn.payment') : t('txn.expense'))}</p>
                        {/* Date moves under the category on mobile (its own column is hidden). */}
                        <p className="text-[11px] text-[#666] tabular-nums sm:hidden">{tx.date}</p>
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

      <TransactionForm
        open={formOpen}
        initial={editing}
        projects={projects}
        clients={clients}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        onDelete={delFromForm}
      />
    </div>
  )
}
