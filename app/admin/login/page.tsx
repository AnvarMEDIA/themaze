'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function AdminLoginPage() {
  const router  = useRouter()
  const [pw, setPw]         = useState('')
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
        toast.success('Welcome back!')
        router.push('/admin')
        router.refresh()
      } else {
        toast.error('Incorrect password')
        setPw('')
      }
    } catch {
      toast.error('Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-maze-black">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="text-3xl font-black text-maze-cream tracking-tight mb-2">MAZE</p>
          <p className="label-sm text-maze-muted">Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label-sm text-maze-muted block mb-2">Password</label>
            <input
              type="password"
              required
              autoFocus
              placeholder="Enter admin password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="w-full bg-maze-dark border border-maze-border rounded-lg px-4 py-3.5 body-lg text-maze-cream placeholder:text-maze-muted focus:outline-none focus:border-maze-lime transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-maze-lime text-maze-black font-bold rounded-lg label-sm hover:bg-white transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center label-sm text-maze-muted">
          Default password: <code className="text-maze-cream">maze2024</code>
          <br />
          <span className="text-[10px]">Change via ADMIN_PASSWORD env variable</span>
        </p>
      </div>
    </div>
  )
}
