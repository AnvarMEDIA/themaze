'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

/**
 * Manual fan-out button — POSTs `/api/admin/notify-indexing` with no
 * body to ping every public URL on the site (home, services, portfolio,
 * insights, every category / client / tag / project / post page) to
 * the IndexNow protocol participants (Bing, Yandex, Seznam, Naver, Yep).
 *
 * Auto-pings already happen on every publish; this is the manual
 * "kick the tyres" button after a redesign or migration.
 */
export function NotifyIndexingButton() {
  const [busy, setBusy] = useState(false)

  const click = async () => {
    setBusy(true)
    try {
      const res  = await fetch('/api/admin/notify-indexing', { method: 'POST' })
      const data = await res.json() as { ok: boolean; status?: number; submitted: number }
      if (data.ok) {
        toast.success(`IndexNow notified · ${data.submitted} URLs`)
      } else {
        toast.error(`IndexNow returned ${data.status ?? 'error'}`)
      }
    } catch {
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={busy}
      title="Push every public URL to Bing / Yandex / Seznam / Naver via IndexNow"
      className="shrink-0 px-4 py-2.5 border border-[#252525] rounded-lg text-sm text-[#999] hover:text-white hover:border-[#444] transition-colors disabled:opacity-60"
    >
      {busy ? '↻ Pinging…' : '↻ Ping search engines'}
    </button>
  )
}
