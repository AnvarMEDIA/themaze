'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { CURRENCIES, type Currency } from '@/lib/finance/types'
import { formatMoney } from '@/lib/finance/money'
import { Field, Text, Select, NumberField } from '@/components/admin/finance/fields'
import { useFinanceLang, LangToggle } from '@/components/admin/finance/lang'

interface SettingsResponse {
  baseCurrency: Currency
  autoRates: boolean
  rates: Partial<Record<Currency, number>>
  effectiveRates: Partial<Record<Currency, number>>
  ratesSource: 'cbu' | 'manual'
  ratesUpdatedAt: string | null
}

export default function FinanceSettingsPage() {
  const router = useRouter()
  const { t, locale } = useFinanceLang()
  const [base, setBase] = useState<Currency>('UZS')
  const [autoRates, setAutoRates] = useState(true)
  const [rates, setRates] = useState<Record<string, string>>({})
  const [effective, setEffective] = useState<Partial<Record<Currency, number>>>({})
  const [source, setSource] = useState<'cbu' | 'manual'>('cbu')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingS, setSavingS] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Password change
  const [cur, setCur] = useState('')
  const [nw, setNw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [savingP, setSavingP] = useState(false)

  const apply = (s: SettingsResponse) => {
    setBase(s.baseCurrency)
    setAutoRates(s.autoRates)
    setRates(Object.fromEntries(Object.entries(s.rates).map(([k, v]) => [k, String(v)])))
    setEffective(s.effectiveRates ?? {})
    setSource(s.ratesSource ?? 'manual')
    setUpdatedAt(s.ratesUpdatedAt ?? null)
  }

  const load = useCallback(async () => {
    const res = await fetch('/api/finance/settings', { cache: 'no-store' })
    if (res.status === 401) { router.push('/admin/finance/unlock'); return }
    apply((await res.json()) as SettingsResponse)
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingS(true)
    try {
      const cleanRates: Record<string, number> = {}
      for (const c of CURRENCIES) {
        if (c === base) continue
        const v = Number(rates[c] || 0)
        if (v > 0) cleanRates[c] = v
      }
      const res = await fetch('/api/finance/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseCurrency: base, rates: cleanRates, autoRates }),
      })
      if (res.status === 401) { router.push('/admin/finance/unlock'); return }
      if (!res.ok) { toast.error(t('toast.saveFail')); return }
      apply((await res.json()) as SettingsResponse)
      toast.success(t('set.saved'))
    } finally {
      setSavingS(false)
    }
  }

  const refresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/finance/rates/refresh', { method: 'POST' })
      if (res.status === 401) { router.push('/admin/finance/unlock'); return }
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean }
      if (res.ok && data.ok) toast.success(t('set.refreshed'))
      else toast.error(t('set.refreshFail'))
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nw !== confirm) { toast.error(t('set.pwMismatch')); return }
    setSavingP(true)
    try {
      const res = await fetch('/api/finance/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current: cur, password: nw }),
      })
      if (res.status === 401) { toast.error(t('set.pwWrong')); return }
      if (!res.ok) { toast.error(t('set.pwFail')); return }
      toast.success(t('set.pwChanged'))
      setCur(''); setNw(''); setConfirm('')
    } finally {
      setSavingP(false)
    }
  }

  const fmtDate = (iso: string | null) => {
    if (!iso || iso.startsWith('1970')) return t('set.ratesNever')
    try {
      return new Intl.DateTimeFormat(locale, {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      }).format(new Date(iso))
    } catch { return iso }
  }

  if (loading) {
    return <div className="px-4 sm:px-6 py-8 max-w-[720px] mx-auto"><div className="h-64 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] animate-pulse" /></div>
  }

  const others = CURRENCIES.filter((c) => c !== base)

  return (
    <div className="px-4 sm:px-6 py-8 max-w-[720px] mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">{t('set.title')}</h1>
        <p className="text-sm text-[#555] mt-0.5">{t('set.subtitle')}</p>
      </div>

      {/* Language */}
      <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white">{t('set.language')}</h2>
          <p className="text-[12px] text-[#555] mt-0.5">EN · RU</p>
        </div>
        <LangToggle />
      </div>

      {/* Currency & rates */}
      <form onSubmit={saveSettings} className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-6 space-y-5">
        <h2 className="text-sm font-semibold text-white">{t('set.currencyTitle')}</h2>
        <Field label={t('set.baseCurrency')} hint={t('set.baseHint')}>
          <Select value={base} onChange={(v) => setBase(v as Currency)} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
        </Field>

        {/* Auto-update toggle */}
        <div className="flex items-start justify-between gap-4 rounded-lg border border-[#1E1E1E] bg-[#0B0B0B] p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">{t('set.autoRates')}</p>
            <p className="text-[12px] text-[#666] mt-0.5">{t('set.autoRatesHint')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoRates}
            onClick={() => setAutoRates((v) => !v)}
            className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${autoRates ? 'bg-[#C8FF47]' : 'bg-[#2A2A2A]'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-out ${autoRates ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        <div>
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#5A5A5A] mb-2">{t('set.rates')}</p>

          {autoRates ? (
            <>
              {/* Read-only CBU rates */}
              <div className="space-y-2">
                {others.map((c) => (
                  <div key={c} className="flex items-center justify-between gap-3 rounded-lg bg-[#111] border border-[#1E1E1E] px-3.5 py-2.5">
                    <span className="text-sm text-[#999] tabular-nums">1 {c}</span>
                    <span className="text-sm text-white tabular-nums">
                      {effective[c] ? `= ${formatMoney(effective[c] as number, base, { locale })}` : '—'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
                <p className="text-[11px] text-[#666]">
                  {source === 'cbu'
                    ? `${t('set.cbuSource')} · ${t('set.ratesUpdated', { date: fmtDate(updatedAt) })}`
                    : t('set.cbuUnavailable')}
                </p>
                <button
                  type="button"
                  onClick={refresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161616] border border-[#2A2A2A] text-[13px] text-[#ddd] hover:border-[#333] transition-colors active:scale-[0.97] disabled:opacity-60"
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className={refreshing ? 'animate-spin' : ''}>
                    <path d="M13.5 8a5.5 5.5 0 10-1.6 3.9M13.5 12V8.5H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {refreshing ? t('set.refreshing') : t('set.refreshNow')}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Manual rate inputs */}
              <div className="space-y-2.5">
                {others.map((c) => (
                  <div key={c} className="flex items-center gap-3">
                    <span className="text-sm text-[#999] w-16 tabular-nums">1 {c}</span>
                    <span className="text-[#555]">=</span>
                    <div className="flex-1">
                      <NumberField value={rates[c] ?? ''} onChange={(v) => setRates((p) => ({ ...p, [c]: v }))} placeholder="0" />
                    </div>
                    <span className="text-sm text-[#999] w-12">{base}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#555] mt-2">{t('set.ratesHint')}</p>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={savingS} className="px-5 py-2.5 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-sm font-bold hover:bg-[#F0EEE6] transition-colors disabled:opacity-60 active:scale-[0.97]">
            {savingS ? t('common.saving') : t('set.saveSettings')}
          </button>
        </div>
      </form>

      {/* Change password */}
      <form onSubmit={changePassword} className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white">{t('set.pwTitle')}</h2>
          <p className="text-[12px] text-[#555] mt-0.5">{t('set.pwSub')}</p>
        </div>
        <Field label={t('set.pwCurrent')}><Text value={cur} onChange={setCur} type="password" required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('set.pwNew')}><Text value={nw} onChange={setNw} type="password" required /></Field>
          <Field label={t('set.pwConfirm')}><Text value={confirm} onChange={setConfirm} type="password" required /></Field>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={savingP} className="px-5 py-2.5 rounded-lg bg-[#161616] border border-[#2A2A2A] text-white text-sm font-semibold hover:border-[#333] transition-colors disabled:opacity-60 active:scale-[0.97]">
            {savingP ? t('set.pwUpdating') : t('set.pwUpdate')}
          </button>
        </div>
      </form>
    </div>
  )
}
