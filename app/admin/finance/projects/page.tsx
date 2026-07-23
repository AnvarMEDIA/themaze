'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatMoney } from '@/lib/finance/money'
import type { Currency, FinanceClient, FinanceProject, FinanceTransaction } from '@/lib/finance/types'
import { ProjectForm } from '@/components/admin/finance/ProjectForm'
import { FIN_COLORS, STATUS_LABEL } from '@/components/admin/finance/tokens'

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<FinanceProject[]>([])
  const [clients, setClients] = useState<FinanceClient[]>([])
  const [txns, setTxns] = useState<FinanceTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FinanceProject | null>(null)

  const load = useCallback(async () => {
    const [pRes, cRes, tRes] = await Promise.all([
      fetch('/api/finance/projects', { cache: 'no-store' }),
      fetch('/api/finance/clients', { cache: 'no-store' }),
      fetch('/api/finance/transactions', { cache: 'no-store' }),
    ])
    if ([pRes, cRes, tRes].some((r) => r.status === 401)) { router.push('/admin/finance/unlock'); return }
    setProjects(await pRes.json())
    setClients(await cRes.json())
    setTxns(await tRes.json())
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (new URLSearchParams(window.location.search).get('new')) openNew() }, [])

  const cliName = useMemo(() => new Map(clients.map((c) => [c.id, c.company || c.name])), [clients])
  // Received per project, counting only same-currency income (avoids mixing).
  const paidByProject = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of txns) {
      if (t.type !== 'income' || !t.projectId) continue
      const proj = projects.find((p) => p.id === t.projectId)
      if (!proj || proj.currency !== t.currency) continue
      m.set(t.projectId, (m.get(t.projectId) ?? 0) + t.amount)
    }
    return m
  }, [txns, projects])

  // Prepayment per project: the payment tagged "Prepayment", else the earliest.
  const prepayByProject = useMemo(() => {
    const byProj = new Map<string, FinanceTransaction[]>()
    for (const t of txns) {
      if (t.type !== 'income' || !t.projectId) continue
      if (!byProj.has(t.projectId)) byProj.set(t.projectId, [])
      byProj.get(t.projectId)!.push(t)
    }
    const m = new Map<string, { amount: number; date: string; currency: Currency }>()
    for (const [pid, list] of byProj) {
      const pre =
        list.find((t) => t.category.trim().toLowerCase() === 'prepayment') ??
        [...list].sort((a, b) => (a.date < b.date ? -1 : 1))[0]
      if (pre) m.set(pid, { amount: pre.amount, date: pre.date, currency: pre.currency })
    }
    return m
  }, [txns])

  const openNew = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (p: FinanceProject) => { setEditing(p); setFormOpen(true) }

  const del = async (p: FinanceProject) => {
    if (!window.confirm(`Delete “${p.title}”? Linked payments stay but lose the link.`)) return
    const res = await fetch(`/api/finance/projects/${p.id}`, { method: 'DELETE' })
    if (res.status === 401) { router.push('/admin/finance/unlock'); return }
    if (res.ok) { toast.success('Project deleted'); setProjects((x) => x.filter((r) => r.id !== p.id)) }
    else toast.error('Could not delete')
  }

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Projects</h1>
          <p className="text-sm text-[#555] mt-0.5">Contracts and their payment progress.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-sm font-bold hover:bg-[#F0EEE6] transition-colors active:scale-[0.97]">
          <span className="text-base leading-none">+</span> Add project
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] animate-pulse" />)}</div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-[#1E1E1E] bg-[#0D0D0D] py-16 text-center">
          <p className="text-white font-semibold mb-1">No projects yet</p>
          <p className="text-sm text-[#666] mb-5">Add a contract to track its value and payments.</p>
          <button onClick={openNew} className="px-4 py-2 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-sm font-bold hover:bg-[#F0EEE6] transition-colors active:scale-[0.97]">Add your first project</button>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => {
            const paid = paidByProject.get(p.id) ?? 0
            const prepay = prepayByProject.get(p.id)
            const pct = p.amount > 0 ? Math.min(100, (paid / p.amount) * 100) : 0
            const outstanding = Math.max(0, p.amount - paid)
            const color = FIN_COLORS.status[p.status]
            return (
              <div key={p.id} className="group rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-5 hover:border-[#2A2A2A] transition-colors">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <h3 className="text-[15px] font-semibold text-white truncate">{p.title}</h3>
                    </div>
                    <p className="text-[12px] text-[#777]">
                      {p.clientId ? cliName.get(p.clientId) ?? 'Unknown client' : 'No client'}
                      {p.startDate && <span className="text-[#444]"> · {p.startDate}{p.endDate ? ` → ${p.endDate}` : ''}</span>}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[15px] font-bold text-white tabular-nums">{formatMoney(p.amount, p.currency)}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color, background: `${color}1A` }}>{STATUS_LABEL[p.status]}</span>
                  </div>
                </div>

                {p.amount > 0 && (
                  <>
                    <div className="h-1.5 rounded-full bg-[#1A1A1A] overflow-hidden mb-3">
                      <div className="h-full rounded-full transition-[width] duration-300 ease-out" style={{ width: `${pct}%`, background: FIN_COLORS.status.active }} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] tabular-nums">
                      <div>
                        <p className="text-[#555] mb-0.5">Prepaid</p>
                        <p className="text-[#bbb]">{prepay ? formatMoney(prepay.amount, prepay.currency) : '—'}</p>
                        {prepay && <p className="text-[#444] mt-0.5">{prepay.date}</p>}
                      </div>
                      <div>
                        <p className="text-[#555] mb-0.5">Received</p>
                        <p className="text-[#8FC748]">{formatMoney(paid, p.currency)}</p>
                      </div>
                      <div>
                        <p className="text-[#555] mb-0.5">Outstanding</p>
                        <p className={outstanding > 0 ? 'text-[#ddd]' : 'text-[#6FA02E]'}>
                          {outstanding > 0 ? formatMoney(outstanding, p.currency) : 'Paid in full'}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-center gap-3 pt-3 mt-2 border-t border-[#161616] opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(p)} className="text-xs text-[#888] hover:text-[#C8FF47]">Edit</button>
                  <button onClick={() => del(p)} className="text-xs text-[#888] hover:text-red-400">Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ProjectForm open={formOpen} initial={editing} clients={clients} onClose={() => setFormOpen(false)} onSaved={load} />
    </div>
  )
}
