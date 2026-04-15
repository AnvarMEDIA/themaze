'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

export default function AdminLoginPage() {
  const [pw, setPw]           = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      })
      if (res.ok) {
        // Hard navigation — ensures the new httpOnly cookie is sent
        // with the next request so middleware sees it immediately.
        window.location.href = '/admin'
      } else {
        toast.error('Incorrect password')
        setPw('')
        setLoading(false)
      }
    } catch {
      toast.error('Something went wrong')
      setLoading(false)
    }
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#5A5A5A] block mb-2">
              Password
            </label>
            <input
              type="password"
              required
              autoFocus
              placeholder="Enter admin password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="w-full bg-[#111] border border-[#252525] rounded-lg px-4 py-3.5 text-[#EDEBE3] placeholder:text-[#5A5A5A] focus:outline-none focus:border-[#C8FF47] transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#C8FF47] text-[#0A0A0A] font-bold rounded-lg text-sm hover:bg-[#F0EEE6] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#5A5A5A]">
          Default password: <code className="text-[#EDEBE3]">maze2024</code>
          <br />
          <span className="text-[10px]">Change via ADMIN_PASSWORD env variable</span>
        </p>
      </div>
    </div>
  )
}
