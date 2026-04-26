'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'

type Step = 'password' | 'mfa'

export default function AdminLoginPage() {
  const [pw,    setPw]    = useState('')
  const [code,  setCode]  = useState('')
  const [step,  setStep]  = useState<Step>('password')
  const [loading, setLoading] = useState(false)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 'mfa') codeRef.current?.focus()
  }, [step])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw, totp: step === 'mfa' ? code : undefined }),
      })
      if (res.ok) {
        // Hard navigation — ensures the new httpOnly cookie is sent
        // with the next request so middleware sees it immediately.
        window.location.href = '/admin'
        return
      }

      const data = await res.json().catch(() => ({})) as { error?: string; mfa?: boolean }

      if (data.mfa && step === 'password') {
        // Server says MFA is enrolled — switch to second step, keep password.
        setStep('mfa')
        setCode('')
        setLoading(false)
        return
      }

      toast.error(
        data.error === 'Invalid code'        ? 'Wrong code, try again'
        : data.error === 'mfa_required'      ? 'MFA code required'
        : data.error === 'Incorrect password' ? 'Incorrect password'
        : 'Sign-in failed',
      )
      if (step === 'password') setPw('')
      else                     setCode('')
      setLoading(false)
    } catch {
      toast.error('Something went wrong')
      setLoading(false)
    }
  }

  const back = () => {
    setStep('password')
    setCode('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#080808]">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="text-3xl font-black text-[#EDEBE3] tracking-tight mb-2">MAZE</p>
          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#5A5A5A]">
            Admin Panel
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {step === 'password' && (
            <div>
              <label className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#5A5A5A] block mb-2">
                Password
              </label>
              <input
                type="password"
                required
                autoFocus
                autoComplete="current-password"
                placeholder="Enter admin password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="w-full bg-[#111] border border-[#252525] rounded-lg px-4 py-3.5 text-[#EDEBE3] placeholder:text-[#5A5A5A] focus:outline-none focus:border-[#C8FF47] transition-colors"
              />
            </div>
          )}

          {step === 'mfa' && (
            <div>
              <label className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#5A5A5A] block mb-2">
                Authentication code
              </label>
              <input
                ref={codeRef}
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full bg-[#111] border border-[#252525] rounded-lg px-4 py-3.5 text-[#EDEBE3] placeholder:text-[#5A5A5A] focus:outline-none focus:border-[#C8FF47] transition-colors text-center tracking-[0.5em] font-mono text-lg"
              />
              <p className="text-xs text-[#5A5A5A] mt-2 text-center">
                Open your authenticator app and enter the current code.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (step === 'mfa' && code.length !== 6)}
            className="w-full py-3.5 bg-[#C8FF47] text-[#0A0A0A] font-bold rounded-lg text-sm hover:bg-[#F0EEE6] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : step === 'mfa' ? 'Verify' : 'Sign in'}
          </button>

          {step === 'mfa' && (
            <button
              type="button"
              onClick={back}
              className="w-full text-xs text-[#5A5A5A] hover:text-[#EDEBE3] transition-colors"
            >
              ← Use a different password
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
