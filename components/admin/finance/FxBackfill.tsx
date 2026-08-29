'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useFinanceLang } from './lang'

interface Pending {
  total: number
  byCurrency: Record<string, number>
  earliest: string | null
  latest: string | null
  maxPerRun: number
}

/**
 * Settling the exchange rate on rows recorded before rates were locked.
 *
 * Until a row carries the rate from its own day, its value in som is
 * recalculated from today's market every time a report opens — so last year's
 * revenue changes whenever the dollar does. This fetches each row's own
 * published rate and writes it in, after which the figure stops moving.
 */
export function FxBackfill() {
  const { t } = useFinanceLang()
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/finance/fx/backfill', { cache: 'no-store' })
    if (!res.ok) return
    setPending(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  const run = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/finance/fx/backfill', { method: 'POST' })
      if (res.status === 401) { window.location.href = '/admin/finance/unlock'; return }
      if (!res.ok) { toast.error(t('fx.fail')); return }
      const data = (await res.json()) as { locked: number; unavailableDates: string[]; remaining: number }
      toast.success(t('fx.done', { n: data.locked }))
      // Both are worth saying out loud rather than leaving to be discovered:
      // a date the bank never published, and work still queued behind the cap.
      if (data.unavailableDates.length > 0) toast(t('fx.unavailable', { n: data.unavailableDates.length }))
      if (data.remaining > 0) toast(t('fx.remaining', { n: data.remaining }))
      await load()
    } finally {
      setBusy(false)
    }
  }

  if (!pending) return null
  const settled = pending.total === 0

  return (
    <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-6">
      <h2 className="text-sm font-semibold text-white">{t('fx.title')}</h2>
      <p className="text-[12px] text-[#555] mt-1 leading-relaxed">{t('fx.body')}</p>

      {settled ? (
        <p className="text-[13px] text-[#8FC748] mt-4">{t('fx.allLocked')}</p>
      ) : (
        <>
          <div className="mt-4 rounded-lg border border-[#FFD447]/25 bg-[#FFD447]/[0.05] px-4 py-3">
            <p className="text-[13px] font-semibold text-[#FFD447]">{t('fx.pending', { n: pending.total })}</p>
            <p className="text-[11px] text-[#8a8272] mt-0.5 tabular-nums">
              {Object.entries(pending.byCurrency).map(([c, n]) => `${c} ${n}`).join(' · ')}
              {pending.earliest && pending.latest && ` · ${t('fx.range', { from: pending.earliest, to: pending.latest })}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              type="button"
              onClick={run}
              disabled={busy}
              className="px-5 py-2.5 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-sm font-bold hover:bg-[#F0EEE6] transition-colors disabled:opacity-60 active:scale-[0.97]"
            >
              {busy ? t('fx.running') : t('fx.run')}
            </button>
            {pending.total > pending.maxPerRun && (
              <span className="text-[11px] text-[#666]">{t('fx.capped', { n: pending.maxPerRun })}</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
