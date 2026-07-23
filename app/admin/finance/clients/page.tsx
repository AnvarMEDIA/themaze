'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import type { FinanceClient } from '@/lib/finance/types'
import { ClientForm } from '@/components/admin/finance/ClientForm'
import { useFinanceLang } from '@/components/admin/finance/lang'

export default function ClientsPage() {
  const router = useRouter()
  const { t } = useFinanceLang()
  const [clients, setClients] = useState<FinanceClient[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FinanceClient | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/finance/clients', { cache: 'no-store' })
    if (res.status === 401) { router.push('/admin/finance/unlock'); return }
    setClients(await res.json())
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (new URLSearchParams(window.location.search).get('new')) openNew() }, [])

  const openNew = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (c: FinanceClient) => { setEditing(c); setFormOpen(true) }

  const del = async (c: FinanceClient) => {
    if (!window.confirm(t('clients.confirmDelete', { name: c.company || c.name }))) return
    const res = await fetch(`/api/finance/clients/${c.id}`, { method: 'DELETE' })
    if (res.status === 401) { router.push('/admin/finance/unlock'); return }
    if (res.ok) { toast.success(t('toast.deleted')); setClients((x) => x.filter((r) => r.id !== c.id)) }
    else toast.error(t('toast.deleteFail'))
  }

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white tracking-tight">{t('clients.title')}</h1>
          <p className="text-sm text-[#555] mt-0.5">{loading ? '…' : t('clients.inBook', { n: clients.length })}</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-sm font-bold hover:bg-[#F0EEE6] transition-colors active:scale-[0.97] whitespace-nowrap flex-shrink-0">
          <span className="text-base leading-none">+</span> {t('clients.add')}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] animate-pulse" />)}
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-xl border border-[#1E1E1E] bg-[#0D0D0D] py-16 text-center">
          <p className="text-white font-semibold mb-1">{t('clients.emptyTitle')}</p>
          <p className="text-sm text-[#666] mb-5">{t('clients.emptyBody')}</p>
          <button onClick={openNew} className="px-4 py-2 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-sm font-bold hover:bg-[#F0EEE6] transition-colors active:scale-[0.97]">{t('clients.addFirst')}</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((c) => (
            <div key={c.id} className="group rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-5 hover:border-[#2A2A2A] transition-colors">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-white truncate">{c.company || c.name}</p>
                  {c.company && c.name && <p className="text-[12px] text-[#777] truncate">{c.name}</p>}
                </div>
                {c.status === 'archived' && (
                  <span className="text-[10px] font-semibold text-[#888] bg-[#1A1A1A] border border-[#252525] px-2 py-0.5 rounded-full flex-shrink-0">{t('clients.archived')}</span>
                )}
              </div>
              <div className="space-y-1 mb-4">
                {c.email && <p className="text-[13px] text-[#999] truncate">✉ {c.email}</p>}
                {c.phone && <p className="text-[13px] text-[#999]">☏ {c.phone}</p>}
                {c.notes && <p className="text-[12px] text-[#666] line-clamp-2 pt-1">{c.notes}</p>}
              </div>
              <div className="flex items-center gap-4 pt-3 border-t border-[#161616] transition-opacity [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100">
                <button onClick={() => openEdit(c)} className="text-xs text-[#888] hover:text-[#C8FF47] py-0.5">{t('common.edit')}</button>
                <button onClick={() => del(c)} className="text-xs text-[#888] hover:text-red-400 py-0.5">{t('common.delete')}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ClientForm open={formOpen} initial={editing} onClose={() => setFormOpen(false)} onSaved={load} />
    </div>
  )
}
