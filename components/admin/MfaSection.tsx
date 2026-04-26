'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface SetupPayload {
  secret:  string
  otpauth: string
  qr:      string
}

export function MfaSection() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [setup,   setSetup]   = useState<SetupPayload | null>(null)
  const [code,    setCode]    = useState('')
  const [busy,    setBusy]    = useState(false)

  const refresh = async () => {
    try {
      const res = await fetch('/api/auth/mfa', { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const data = await res.json() as { enabled: boolean }
      setEnabled(data.enabled)
    } catch {
      toast.error('Failed to load MFA status')
    }
  }

  useEffect(() => { refresh() }, [])

  const beginSetup = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/auth/mfa', { method: 'POST' })
      if (!res.ok) throw new Error()
      setSetup(await res.json())
      setCode('')
    } catch {
      toast.error('Could not start MFA setup')
    } finally {
      setBusy(false)
    }
  }

  const verifyAndSave = async () => {
    if (!setup) return
    setBusy(true)
    try {
      const res = await fetch('/api/auth/mfa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: setup.secret, code }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        toast.error(data.error === 'Invalid code' ? 'Wrong code, try again' : 'Verification failed')
        setCode('')
        return
      }
      toast.success('Two-factor authentication enabled')
      setSetup(null)
      setCode('')
      refresh()
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    if (!confirm('Disable two-factor authentication? Your account will be protected only by the password.')) return
    setBusy(true)
    try {
      const res = await fetch('/api/auth/mfa', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('MFA disabled')
      refresh()
    } catch {
      toast.error('Failed to disable MFA')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#1E1E1E] flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-[#555]">Two-factor authentication</h2>
        {enabled !== null && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
            enabled ? 'bg-[#C8FF47]/15 text-[#C8FF47]' : 'bg-[#1A1A1A] text-[#555]'
          }`}>
            {enabled ? 'On' : 'Off'}
          </span>
        )}
      </div>
      <div className="p-5">
        {enabled === null && (
          <div className="h-12 rounded-lg bg-[#0D0D0D] animate-pulse" />
        )}

        {enabled === false && !setup && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <p className="text-sm text-[#aaa]">
              Add a second factor — a 6-digit code from Google Authenticator, 1Password, Authy etc.
            </p>
            <button
              type="button"
              onClick={beginSetup}
              disabled={busy}
              className="shrink-0 px-4 py-2 border border-[#252525] rounded-lg text-sm text-[#999] hover:text-white hover:border-[#444] transition-colors disabled:opacity-60"
            >
              {busy ? 'Loading…' : 'Enable 2FA'}
            </button>
          </div>
        )}

        {enabled === false && setup && (
          <div className="space-y-4">
            <p className="text-sm text-[#aaa]">
              1. Scan the QR code with your authenticator app, or enter the secret manually.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={setup.qr} alt="MFA QR code" className="w-40 h-40 rounded-lg bg-white p-2 shrink-0" />
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#444] mb-1">Secret</p>
                  <code className="block w-full text-xs font-mono text-[#C8FF47] bg-[#111] border border-[#252525] rounded-lg p-2.5 break-all">
                    {setup.secret}
                  </code>
                </div>
                <p className="text-sm text-[#aaa]">2. Enter the 6-digit code your app displays:</p>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-[#111] border border-[#252525] rounded-lg px-3 py-2.5 text-center tracking-[0.4em] font-mono text-lg text-white focus:outline-none focus:border-[#C8FF47] transition-colors"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={verifyAndSave}
                    disabled={busy || code.length !== 6}
                    className="px-5 py-2 bg-[#C8FF47] text-[#0A0A0A] font-bold rounded-lg text-sm hover:bg-[#F0EEE6] transition-colors disabled:opacity-60"
                  >
                    {busy ? 'Verifying…' : 'Verify & enable'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSetup(null); setCode('') }}
                    disabled={busy}
                    className="px-5 py-2 border border-[#252525] text-[#666] rounded-lg text-sm hover:border-[#333] hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {enabled === true && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <p className="text-sm text-[#aaa]">
              Two-factor authentication is active. You will be asked for a code on every sign-in.
            </p>
            <button
              type="button"
              onClick={disable}
              disabled={busy}
              className="shrink-0 px-4 py-2 border border-[#252525] rounded-lg text-sm text-[#999] hover:text-red-400 hover:border-red-500/40 transition-colors disabled:opacity-60"
            >
              {busy ? 'Disabling…' : 'Disable 2FA'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
