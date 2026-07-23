'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useFinanceLang, LangToggle } from '@/components/admin/finance/lang'

type Mode = 'loading' | 'set' | 'enter'

export default function FinanceUnlockPage() {
  const { t } = useFinanceLang()
  const [mode, setMode] = useState<Mode>('loading')
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/finance/status', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { passwordSet: false, unlocked: false }))
      .then((d: { passwordSet: boolean; unlocked: boolean }) => {
        if (d.unlocked) { window.location.href = '/admin/finance'; return }
        setMode(d.passwordSet ? 'enter' : 'set')
      })
      .catch(() => setMode('enter'))
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'set' && pw !== confirm) { toast.error(t('unlock.mismatch')); return }
    setBusy(true)
    try {
      const res =
        mode === 'set'
          ? await fetch('/api/finance/password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password: pw }),
            })
          : await fetch('/api/finance/unlock', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password: pw }),
            })

      if (res.ok) { window.location.href = '/admin/finance'; return }

      const data = await res.json().catch(() => ({})) as { error?: string }
      if (res.status === 429) toast.error(t('unlock.tooMany'))
      else if (mode === 'set') toast.error(data.error === 'Invalid data' ? t('unlock.min6') : t('unlock.setFail'))
      else toast.error(t('unlock.incorrect'))
      setPw('')
      setConfirm('')
      setBusy(false)
    } catch {
      toast.error(t('unlock.generic'))
      setBusy(false)
    }
  }

  if (mode === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080808]">
        <div className="w-6 h-6 rounded-full border-2 border-[#252525] border-t-[#C8FF47] animate-spin" />
      </div>
    )
  }

  const setting = mode === 'set'

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#080808]">
      <div className="absolute top-5 right-5"><LangToggle /></div>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex w-12 h-12 items-center justify-center rounded-xl bg-[#C8FF47]/12 text-[#C8FF47] mb-4">
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
              <rect x="3" y="7" width="10" height="7" rx="1.8" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-lg font-bold text-[#EDEBE3] tracking-tight">{t('unlock.title')}</p>
          <p className="text-[13px] text-[#5A5A5A] mt-1">
            {setting ? t('unlock.subSet') : t('unlock.subEnter')}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#5A5A5A] block mb-2">
              {setting ? t('unlock.newLabel') : t('unlock.enterLabel')}
            </label>
            <input
              type="password"
              required
              autoFocus
              minLength={setting ? 6 : undefined}
              autoComplete={setting ? 'new-password' : 'current-password'}
              placeholder={setting ? t('unlock.newPlaceholder') : t('unlock.enterPlaceholder')}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="w-full bg-[#111] border border-[#252525] rounded-lg px-4 py-3.5 text-[#EDEBE3] placeholder:text-[#5A5A5A] focus:outline-none focus:border-[#C8FF47] transition-colors"
            />
          </div>

          {setting && (
            <div>
              <label className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#5A5A5A] block mb-2">{t('unlock.confirm')}</label>
              <input
                type="password"
                required
                autoComplete="new-password"
                placeholder={t('unlock.confirmPlaceholder')}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-[#111] border border-[#252525] rounded-lg px-4 py-3.5 text-[#EDEBE3] placeholder:text-[#5A5A5A] focus:outline-none focus:border-[#C8FF47] transition-colors"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3.5 bg-[#C8FF47] text-[#0A0A0A] font-bold rounded-lg text-sm hover:bg-[#F0EEE6] transition-colors disabled:opacity-60 active:scale-[0.99]"
          >
            {busy ? t('unlock.wait') : setting ? t('unlock.setBtn') : t('unlock.unlockBtn')}
          </button>
        </form>

        {setting && (
          <p className="text-[11px] text-[#4A4A4A] mt-4 text-center leading-relaxed">
            {t('unlock.note')}
          </p>
        )}

        <a href="/admin" className="block text-center text-xs text-[#5A5A5A] hover:text-[#EDEBE3] transition-colors mt-6">
          {t('unlock.back')}
        </a>
      </div>
    </div>
  )
}
