'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatMoney, DEFAULT_FINANCE_SETTINGS } from '@/lib/finance/money'
import { projectRollup, type ProjectRollup } from '@/lib/finance/rollup'
import type { Currency, FinanceClient, FinanceProject, FinanceSettings, FinanceTransaction } from '@/lib/finance/types'
import { ProjectForm } from '@/components/admin/finance/ProjectForm'
import { FIN_COLORS } from '@/components/admin/finance/tokens'
import { useFinanceLang } from '@/components/admin/finance/lang'

interface SettingsResponse {
  baseCurrency: Currency
  effectiveRates: Partial<Record<Currency, number>>
}

export default function ProjectsPage() {
  const router = useRouter()
  const { t, locale, tStatus } = useFinanceLang()
  const [projects, setProjects] = useState<FinanceProject[]>([])
  const [clients, setClients] = useState<FinanceClient[]>([])
  const [txns, setTxns] = useState<FinanceTransaction[]>([])
  const [settings, setSettings] = useState<FinanceSettings>(DEFAULT_FINANCE_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FinanceProject | null>(null)

  const load = useCallback(async () => {
    const [pRes, cRes, tRes, sRes] = await Promise.all([
      fetch('/api/finance/projects', { cache: 'no-store' }),
      fetch('/api/finance/clients', { cache: 'no-store' }),
      fetch('/api/finance/transactions', { cache: 'no-store' }),
      fetch('/api/finance/settings', { cache: 'no-store' }),
    ])
    if ([pRes, cRes, tRes, sRes].some((r) => r.status === 401)) { router.push('/admin/finance/unlock'); return }
    setProjects(await pRes.json())
    setClients(await cRes.json())
    setTxns(await tRes.json())
    // Use the EFFECTIVE rates (Central Bank when auto-rates is on) — the same
    // ones the dashboard converts with, so both screens agree.
    const s = (await sRes.json()) as SettingsResponse
    setSettings({
      ...DEFAULT_FINANCE_SETTINGS,
      baseCurrency: s.baseCurrency,
      rates: s.effectiveRates ?? {},
    })
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (new URLSearchParams(window.location.search).get('new')) openNew() }, [])

  const cliName = useMemo(() => new Map(clients.map((c) => [c.id, c.company || c.name])), [clients])

  // One rollup per project — payments in other currencies are converted,
  // not skipped, so "Received" here matches the dashboard's receivables.
  const rollups = useMemo(() => {
    const m = new Map<string, ProjectRollup>()
    for (const p of projects) m.set(p.id, projectRollup(p, txns, settings))
    return m
  }, [projects, txns, settings])

  const openNew = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (p: FinanceProject) => { setEditing(p); setFormOpen(true) }

  const del = async (p: FinanceProject) => {
    if (!window.confirm(t('projs.confirmDelete', { name: p.title }))) return
    const res = await fetch(`/api/finance/projects/${p.id}`, { method: 'DELETE' })
    if (res.status === 401) { router.push('/admin/finance/unlock'); return }
    if (res.ok) { toast.success(t('toast.deleted')); setProjects((x) => x.filter((r) => r.id !== p.id)) }
    else toast.error(t('toast.deleteFail'))
  }

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white tracking-tight">{t('projs.title')}</h1>
          <p className="text-sm text-[#555] mt-0.5">{t('projs.subtitle')}</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-sm font-bold hover:bg-[#F0EEE6] transition-colors active:scale-[0.97] whitespace-nowrap flex-shrink-0">
          <span className="text-base leading-none">+</span> {t('projs.add')}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] animate-pulse" />)}</div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-[#1E1E1E] bg-[#0D0D0D] py-16 text-center">
          <p className="text-white font-semibold mb-1">{t('projs.emptyTitle')}</p>
          <p className="text-sm text-[#666] mb-5">{t('projs.emptyBody')}</p>
          <button onClick={openNew} className="px-4 py-2 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-sm font-bold hover:bg-[#F0EEE6] transition-colors active:scale-[0.97]">{t('projs.addFirst')}</button>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => {
            const roll = rollups.get(p.id)
            const paid = roll?.received ?? 0
            const prepay = roll?.prepayment ?? null
            const unconverted = roll?.unconverted ?? []
            const pct = p.amount > 0 ? Math.min(100, (paid / p.amount) * 100) : 0
            const outstanding = roll?.outstanding ?? p.amount
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
                      {p.clientId ? cliName.get(p.clientId) ?? t('projs.unknownClient') : t('projs.noClient')}
                      {p.startDate && <span className="text-[#444]"> · {p.startDate}{p.endDate ? ` → ${p.endDate}` : ''}</span>}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[15px] font-bold text-white tabular-nums">{formatMoney(p.amount, p.currency, { locale })}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color, background: `${color}1A` }}>{tStatus(p.status)}</span>
                  </div>
                </div>

                {p.amount > 0 && (
                  <>
                    <div className="h-1.5 rounded-full bg-[#1A1A1A] overflow-hidden mb-3">
                      <div className="h-full rounded-full transition-[width] duration-300 ease-out" style={{ width: `${pct}%`, background: FIN_COLORS.status.active }} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] tabular-nums">
                      <div>
                        <p className="text-[#555] mb-0.5">{t('projs.prepaid')}</p>
                        <p className="text-[#bbb]">{prepay ? formatMoney(prepay.amount, prepay.currency, { locale }) : '—'}</p>
                        {prepay && <p className="text-[#444] mt-0.5">{prepay.date}</p>}
                      </div>
                      <div>
                        <p className="text-[#555] mb-0.5">{t('projs.received')}</p>
                        <p className="text-[#8FC748]">{formatMoney(paid, p.currency, { locale })}</p>
                      </div>
                      <div>
                        <p className="text-[#555] mb-0.5">{t('projs.outstanding')}</p>
                        <p className={outstanding > 0 ? 'text-[#ddd]' : 'text-[#6FA02E]'}>
                          {outstanding > 0 ? formatMoney(outstanding, p.currency, { locale }) : t('projs.paidInFull')}
                        </p>
                      </div>
                    </div>
                    {unconverted.length > 0 && (
                      <p className="mt-2 text-[11px] text-[#FFD447]">
                        {t('projs.unconverted', { list: unconverted.join(', ') })}
                      </p>
                    )}
                  </>
                )}

                <div className="flex items-center gap-4 pt-3 mt-2 border-t border-[#161616] transition-opacity [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100">
                  <button onClick={() => openEdit(p)} className="text-xs text-[#888] hover:text-[#C8FF47] py-0.5">{t('common.edit')}</button>
                  <button onClick={() => del(p)} className="text-xs text-[#888] hover:text-red-400 py-0.5">{t('common.delete')}</button>
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
