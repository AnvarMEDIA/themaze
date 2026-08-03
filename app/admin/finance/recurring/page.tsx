'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatMoney } from '@/lib/finance/money'
import type { FinanceClient, FinanceProject, FinanceRecurring } from '@/lib/finance/types'
import { dueDates, MAX_CATCH_UP } from '@/lib/finance/recurring'
import { todayLocal } from '@/lib/finance/date'
import { useFinanceLang } from '@/components/admin/finance/lang'
import { RecurringForm } from '@/components/admin/finance/RecurringForm'

export default function RecurringPage() {
  const router = useRouter()
  const { t, locale } = useFinanceLang()
  const [rows, setRows] = useState<FinanceRecurring[]>([])
  const [projects, setProjects] = useState<FinanceProject[]>([])
  const [clients, setClients] = useState<FinanceClient[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FinanceRecurring | null>(null)
  const [posting, setPosting] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [rRes, pRes, cRes] = await Promise.all([
      fetch('/api/finance/recurring', { cache: 'no-store' }),
      fetch('/api/finance/projects', { cache: 'no-store' }),
      fetch('/api/finance/clients', { cache: 'no-store' }),
    ])
    if ([rRes, pRes, cRes].some((r) => r.status === 401)) { router.push('/admin/finance/unlock'); return }
    setRows(await rRes.json())
    setProjects(await pRes.json())
    setClients(await cRes.json())
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  const today = todayLocal()
  // The same scheduling maths the server uses, so the screen and the books
  // can never disagree about what is due.
  const dueFor = useMemo(() => {
    const m = new Map<string, { dates: string[]; truncated: boolean }>()
    for (const r of rows) m.set(r.id, dueDates(r, today))
    return m
  }, [rows, today])

  const totalDue = useMemo(
    () => [...dueFor.values()].reduce((n, d) => n + d.dates.length, 0),
    [dueFor],
  )

  const openNew = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (r: FinanceRecurring) => { setEditing(r); setFormOpen(true) }

  const del = async () => {
    if (!editing) return
    if (!window.confirm(t('rec.confirmDelete'))) return
    const res = await fetch(`/api/finance/recurring/${editing.id}`, { method: 'DELETE' })
    if (res.status === 401) { router.push('/admin/finance/unlock'); return }
    if (!res.ok) { toast.error(t('toast.deleteFail')); return }
    toast.success(t('toast.deleted'))
    setFormOpen(false)
    load()
  }

  const togglePause = async (r: FinanceRecurring) => {
    const res = await fetch(`/api/finance/recurring/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !r.active }),
    })
    if (res.status === 401) { router.push('/admin/finance/unlock'); return }
    if (!res.ok) { toast.error(t('rec.saveFail')); return }
    setRows((cur) => cur.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x)))
  }

  /** Post the due occurrences of one series into the ledger. */
  const post = async (r: FinanceRecurring) => {
    const dates = dueFor.get(r.id)?.dates ?? []
    if (dates.length === 0) return
    setPosting(r.id)
    try {
      const res = await fetch(`/api/finance/recurring/${r.id}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates }),
      })
      if (res.status === 401) { router.push('/admin/finance/unlock'); return }
      // 409 means someone (or a double-click) already booked these. Say so
      // plainly rather than reporting a success that didn't happen.
      if (res.status === 409) { toast(t('rec.alreadyPosted')); await load(); return }
      if (!res.ok) { toast.error(t('rec.recordFail')); return }
      const data = (await res.json()) as { posted: number }
      toast.success(t('rec.recorded', { n: data.posted }))
      await load()
    } finally {
      setPosting(null)
    }
  }

  const projName = useMemo(() => new Map(projects.map((p) => [p.id, p.title])), [projects])
  const cliName = useMemo(() => new Map(clients.map((c) => [c.id, c.company || c.name])), [clients])

  const intervalLabel: Record<string, string> = {
    monthly: t('rec.intervalMonthly'),
    quarterly: t('rec.intervalQuarterly'),
    yearly: t('rec.intervalYearly'),
  }

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white tracking-tight">{t('rec.title')}</h1>
          <p className="text-sm text-[#555] mt-0.5">{t('rec.subtitle')}</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-sm font-bold hover:bg-[#F0EEE6] transition-colors active:scale-[0.97] whitespace-nowrap flex-shrink-0"
        >
          <span className="text-base leading-none">+</span> {t('rec.add')}
        </button>
      </div>

      {totalDue > 0 && (
        <div className="mb-5 rounded-xl border border-[#C8FF47]/25 bg-[#C8FF47]/[0.05] px-5 py-4">
          <p className="text-[13px] font-semibold text-[#C8FF47]">{t('rec.dueBanner', { n: totalDue })}</p>
          <p className="text-[12px] text-[#8a8a7a] mt-0.5">{t('rec.dueBannerHint')}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-[#1E1E1E] bg-[#0D0D0D] px-6 py-14 text-center">
          <p className="text-white font-semibold mb-1">{t('rec.empty')}</p>
          <p className="text-sm text-[#666]">{t('rec.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const due = dueFor.get(r.id) ?? { dates: [], truncated: false }
            const ended = !r.nextDate
            return (
              <div
                key={r.id}
                className={`rounded-xl bg-[#0D0D0D] border p-5 transition-colors ${
                  due.dates.length > 0 ? 'border-[#C8FF47]/30' : 'border-[#1E1E1E]'
                }`}
              >
                <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-xs flex-shrink-0"
                        style={{ color: r.type === 'income' ? '#8FC748' : '#E27A5C' }}
                        aria-hidden="true"
                      >
                        {r.type === 'income' ? '↑' : '↓'}
                      </span>
                      <button
                        onClick={() => openEdit(r)}
                        className="text-sm font-semibold text-white hover:text-[#C8FF47] transition-colors text-left truncate"
                      >
                        {r.title}
                      </button>
                      {!r.active && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#1A1A1A] text-[#777]">{t('rec.paused')}</span>
                      )}
                      {ended && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#1A1A1A] text-[#777]">{t('rec.ended')}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#666] mt-1 truncate">
                      {intervalLabel[r.interval]}
                      {r.clientId && ` · ${cliName.get(r.clientId) ?? ''}`}
                      {r.projectId && ` · ${projName.get(r.projectId) ?? ''}`}
                      {!ended && ` · ${t('rec.nextDue', { date: r.nextDate })}`}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold tabular-nums ${r.type === 'income' ? 'text-[#8FC748]' : 'text-[#E27A5C]'}`}>
                      {r.type === 'income' ? '+' : '−'}{formatMoney(r.amount, r.currency, { locale })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => togglePause(r)}
                      className="px-3 py-2 rounded-lg text-[12px] text-[#888] hover:text-white border border-[#252525] hover:border-[#333] transition-colors active:scale-[0.97]"
                    >
                      {r.active ? t('rec.pause') : t('rec.resume')}
                    </button>
                    {due.dates.length > 0 && (
                      <button
                        onClick={() => post(r)}
                        disabled={posting === r.id}
                        className="px-3 py-2 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-[12px] font-bold hover:bg-[#F0EEE6] transition-colors active:scale-[0.97] disabled:opacity-60 whitespace-nowrap"
                      >
                        {due.dates.length > 1
                          ? `${t('rec.recordAll')} (${due.dates.length})`
                          : t('rec.record')}
                      </button>
                    )}
                  </div>
                </div>

                {due.dates.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#1A1A1A] flex flex-wrap gap-x-4 gap-y-1">
                    {due.dates.map((d) => (
                      <span key={d} className="text-[11px] text-[#999] tabular-nums">
                        {d}
                        <span className="text-[#E27A5C] ml-1.5">
                          {d === today
                            ? t('rec.dueToday')
                            : t('rec.overdueBy', { n: Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${d}T00:00:00Z`)) / 86_400_000) })}
                        </span>
                      </span>
                    ))}
                    {due.truncated && (
                      <span className="text-[11px] text-[#FFD447]">{t('rec.truncated', { n: MAX_CATCH_UP })}</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <RecurringForm
        open={formOpen}
        initial={editing}
        projects={projects}
        clients={clients}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        onDelete={del}
      />
    </div>
  )
}
