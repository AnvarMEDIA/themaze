'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { indexNowMessage, type IndexNowReply } from '@/lib/indexNowStatus'

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
      const res = await fetch('/api/admin/notify-indexing', { method: 'POST' })
      const reply = await res.json().catch(() => ({})) as IndexNowReply
      const { ok, text } = indexNowMessage(res.status, reply)
      if (ok) toast.success(text)
      else toast.error(text, { duration: 6000 })
    } catch {
      toast.error('Нет связи с сайтом — проверьте интернет')
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
      className="shrink-0 px-4 py-2.5 border border-[#252525] rounded-lg text-sm text-[#999] hover:text-white hover:border-[#444] transition-[color,border-color,transform] duration-150 ease-out active:scale-[0.97] disabled:opacity-60"
    >
      {busy ? '↻ Pinging…' : '↻ Ping search engines'}
    </button>
  )
}
