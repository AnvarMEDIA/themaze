'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { MonthLedger } from '@/lib/finance/calendar'
import { Calendar } from '@/components/admin/finance/Calendar'
import { useFinanceLang } from '@/components/admin/finance/lang'
import {
  calendarHref, isValidMonth, readCalMonth, writeCalMonth,
} from '@/components/admin/finance/calendarMonth'

export default function CalendarPage() {
  // useSearchParams needs a Suspense boundary to keep the route static-safe.
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarTab />
    </Suspense>
  )
}

function CalendarTab() {
  const router = useRouter()
  const params = useSearchParams()
  const { t } = useFinanceLang()

  const [month, setMonth] = useState('')
  const [ledger, setLedger] = useState<MonthLedger | null>(null)
  const [loading, setLoading] = useState(true)

  // A `?month=` link wins over the remembered month; otherwise pick up where
  // the studio left off. Resolved after mount because localStorage is
  // client-only, and an empty month means "not decided yet" so the first
  // fetch isn't fired against the wrong window.
  useEffect(() => {
    const fromUrl = params.get('month')
    setMonth(isValidMonth(fromUrl) ? fromUrl : readCalMonth())
  }, [params])

  const load = useCallback(async () => {
    if (!month) return
    setLoading(true)
    const res = await fetch(`/api/finance/calendar?month=${month}`, { cache: 'no-store' })
    if (res.status === 401) { router.push('/admin/finance/unlock'); return }
    setLedger(await res.json())
    setLoading(false)
  }, [router, month])

  useEffect(() => { load() }, [load])

  const changeMonth = (m: string) => {
    setMonth(m)
    writeCalMonth(m)
    // history.replaceState, not router.replace: the URL should stay shareable
    // without re-running the route and re-mounting the grid on every ‹ › click.
    try { window.history.replaceState(null, '', calendarHref(m)) } catch { /* ignore */ }
  }

  if (!month) return <CalendarSkeleton />

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{t('cal.title')}</h1>
        <p className="text-sm text-[#555] mt-1">{t('cal.subtitle')}</p>
      </div>

      <Calendar
        ledger={ledger}
        month={month}
        onMonthChange={changeMonth}
        loading={loading}
      />
    </div>
  )
}

function CalendarSkeleton() {
  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      <div className="h-8 w-56 bg-[#141414] rounded animate-pulse mb-8" />
      <div className="h-[560px] rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] animate-pulse" />
    </div>
  )
}
