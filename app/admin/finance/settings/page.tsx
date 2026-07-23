'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { CURRENCIES, type Currency, type FinanceSettings } from '@/lib/finance/types'
import { CURRENCY_META } from '@/lib/finance/money'
import { Field, Text, Select, NumberField } from '@/components/admin/finance/fields'

export default function FinanceSettingsPage() {
  const router = useRouter()
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
      if (!res.ok) { toast.error('Could not save'); return }
      toast.success('Settings saved')
    } finally {
      setSavingS(false)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nw !== confirm) { toast.error('New passwords do not match'); return }
    setSavingP(true)
    try {
      const res = await fetch('/api/finance/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current: cur, password: nw }),
      })
      if (res.status === 401) { toast.error('Current password is incorrect'); return }
      if (!res.ok) { toast.error('Could not change password'); return }
      toast.success('Finance password changed')
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
        <h1 className="text-xl font-bold text-white tracking-tight">Finance settings</h1>
        <p className="text-sm text-[#555] mt-0.5">Base currency, exchange rates, and access.</p>
      </div>

      {/* Currency & rates */}
      <form onSubmit={saveSettings} className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-6 space-y-5">
        <h2 className="text-sm font-semibold text-white">Currency &amp; exchange rates</h2>
        <Field label="Base currency" hint="Dashboard totals are shown in this currency.">
          <Select value={base} onChange={(v) => setBase(v as Currency)} options={CURRENCIES.map((c) => ({ value: c, label: `${c} — ${CURRENCY_META[c].label}` }))} />
        </Field>

        <div>
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#5A5A5A] mb-2">Exchange rates</p>
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
          <p className="text-[11px] text-[#555] mt-2">These are your own rates — update them whenever you like. Conversions are transparent, never a live feed.</p>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={savingS} className="px-5 py-2.5 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-sm font-bold hover:bg-[#F0EEE6] transition-colors disabled:opacity-60 active:scale-[0.97]">
            {savingS ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>

      {/* Change password */}
      <form onSubmit={changePassword} className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Change finance password</h2>
          <p className="text-[12px] text-[#555] mt-0.5">This is separate from your admin password.</p>
        </div>
        <Field label="Current password"><Text value={cur} onChange={setCur} type="password" required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="New password"><Text value={nw} onChange={setNw} type="password" required /></Field>
          <Field label="Confirm new"><Text value={confirm} onChange={setConfirm} type="password" required /></Field>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={savingP} className="px-5 py-2.5 rounded-lg bg-[#161616] border border-[#2A2A2A] text-white text-sm font-semibold hover:border-[#333] transition-colors disabled:opacity-60 active:scale-[0.97]">
            {savingP ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  )
}
