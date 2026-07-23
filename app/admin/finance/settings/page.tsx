'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { CURRENCIES, type Currency, type FinanceSettings } from '@/lib/finance/types'
import { Field, Text, Select, NumberField } from '@/components/admin/finance/fields'
import { useFinanceLang, LangToggle } from '@/components/admin/finance/lang'

export default function FinanceSettingsPage() {
  const router = useRouter()
  const { t } = useFinanceLang()
  const [base, setBase] = useState<Currency>('UZS')
  const [rates, setRates] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingS, setSavingS] = useState(false)

  // Password change
  const [cur, setCur] = useState('')
  const [nw, setNw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [savingP, setSavingP] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/finance/settings', { cache: 'no-store' })
    if (res.status === 401) { router.push('/admin/finance/unlock'); return }
    const s = (await res.json()) as FinanceSettings
    setBase(s.baseCurrency)
    setRates(Object.fromEntries(Object.entries(s.rates).map(([k, v]) => [k, String(v)])))
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
        body: JSON.stringify({ baseCurrency: base, rates: cleanRates }),
      })
      if (res.status === 401) { router.push('/admin/finance/unlock'); return }
      if (!res.ok) { toast.error(t('toast.saveFail')); return }
      toast.success(t('set.saved'))
    } finally {
      setSavingS(false)
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

  if (loading) {
    return <div className="px-6 py-8 max-w-[720px] mx-auto"><div className="h-64 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] animate-pulse" /></div>
  }

  return (
    <div className="px-6 py-8 max-w-[720px] mx-auto space-y-6">
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

        <div>
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#5A5A5A] mb-2">{t('set.rates')}</p>
          <div className="space-y-2.5">
            {CURRENCIES.filter((c) => c !== base).map((c) => (
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
