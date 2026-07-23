'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatMoney } from '@/lib/finance/money'
import type { FinanceClient, FinanceProject, FinanceTransaction, TransactionType } from '@/lib/finance/types'
import { TransactionForm } from '@/components/admin/finance/TransactionForm'
import { METHOD_LABEL } from '@/components/admin/finance/tokens'

type Filter = 'all' | TransactionType

export default function TransactionsPage() {
  const router = useRouter()
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
  const openEdit = (t: FinanceTransaction) => { setEditing(t); setFormOpen(true) }

  const del = async (t: FinanceTransaction) => {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return
    const res = await fetch(`/api/finance/transactions/${t.id}`, { method: 'DELETE' })
    if (res.status === 401) { router.push('/admin/finance/unlock'); return }
    if (res.ok) { toast.success('Deleted'); setTxns((x) => x.filter((r) => r.id !== t.id)) }
    else toast.error('Could not delete')
  }

  const rows = filter === 'all' ? txns : txns.filter((t) => t.type === filter)

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Transactions</h1>
          <p className="text-sm text-[#555] mt-0.5">Every payment in and out.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-sm font-bold hover:bg-[#F0EEE6] transition-colors active:scale-[0.97]">
          <span className="text-base leading-none">+</span> Record
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
            {k}
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded bg-[#141414] animate-pulse" />)}</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-[#666] mb-3">No transactions {filter !== 'all' ? `(${filter})` : 'yet'}.</p>
            <button onClick={openNew} className="text-sm text-[#C8FF47] hover:underline">Record your first one →</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[#555] border-b border-[#1A1A1A]">
                <th className="font-medium px-5 py-3">Date</th>
                <th className="font-medium px-3 py-3">Category</th>
                <th className="font-medium px-3 py-3 hidden md:table-cell">Project</th>
                <th className="font-medium px-3 py-3 hidden lg:table-cell">Client</th>
                <th className="font-medium px-3 py-3 hidden sm:table-cell">Method</th>
                <th className="font-medium px-3 py-3 text-right">Amount</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-[#151515] last:border-b-0 hover:bg-[#111] transition-colors group">
                  <td className="px-5 py-3 text-[#999] tabular-nums whitespace-nowrap">{t.date}</td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: t.type === 'income' ? '#8FC748' : '#E27A5C' }} aria-hidden="true">
                        {t.type === 'income' ? '↓' : '↑'}
                      </span>
                      <span className="text-white truncate max-w-[160px]">{t.category || (t.type === 'income' ? 'Payment' : 'Expense')}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[#888] hidden md:table-cell truncate max-w-[160px]">{t.projectId ? projName.get(t.projectId) ?? '—' : '—'}</td>
                  <td className="px-3 py-3 text-[#888] hidden lg:table-cell truncate max-w-[140px]">{t.clientId ? cliName.get(t.clientId) ?? '—' : '—'}</td>
                  <td className="px-3 py-3 text-[#777] hidden sm:table-cell">{METHOD_LABEL[t.method]}</td>
                  <td className="px-3 py-3 text-right tabular-nums font-medium whitespace-nowrap" style={{ color: t.type === 'income' ? '#8FC748' : '#E27A5C' }}>
                    {t.type === 'income' ? '+' : '−'}{formatMoney(t.amount, t.currency)}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(t)} className="text-xs text-[#666] hover:text-[#C8FF47] mr-3">Edit</button>
                      <button onClick={() => del(t)} className="text-xs text-[#666] hover:text-red-400">Delete</button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <TransactionForm
        open={formOpen}
        initial={editing}
        projects={projects}
        clients={clients}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
    </div>
  )
}
