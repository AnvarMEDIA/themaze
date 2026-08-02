'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

/**
 * Shows whether new-inquiry alerts are actually wired up, and lets the studio
 * prove it by sending a test message. Added after a real inquiry arrived with
 * no notification: the integration must be verifiable, not assumed.
 */
export function NotificationsSection() {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch('/api/notify/test', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((d: { configured: boolean }) => setConfigured(d.configured))
      .catch(() => setConfigured(false))
  }, [])

  const sendTest = async () => {
    setSending(true)
    try {
      const res = await fetch('/api/notify/test', { method: 'POST' })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (res.ok && data.ok) toast.success('Test message sent — check Telegram')
      else if (data.error === 'not_configured') toast.error('Telegram is not configured yet')
      else toast.error(`Could not send: ${data.error ?? 'unknown error'}`)
    } catch {
      toast.error('Could not send the test message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#1E1E1E]">
        <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-[#555]">
          Inquiry alerts
        </h2>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm text-[#ddd] flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background:
                    configured === null ? '#555' : configured ? '#6FA02E' : '#D9563A',
                }}
              />
              {configured === null
                ? 'Checking…'
                : configured
                  ? 'Telegram alerts are active'
                  : 'Telegram alerts are NOT set up'}
            </p>
            <p className="text-xs text-[#666] mt-1.5 leading-relaxed">
              {configured
                ? 'Every new contact-form inquiry is posted to your Telegram chat.'
                : 'Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in the Vercel project settings, then redeploy. Inquiries are always saved here regardless.'}
            </p>
          </div>
          <button
            onClick={sendTest}
            disabled={sending || configured !== true}
            className="px-4 py-2.5 rounded-lg bg-[#161616] border border-[#2A2A2A] text-sm font-semibold text-white hover:border-[#333] transition-colors active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {sending ? 'Sending…' : 'Send test message'}
          </button>
        </div>
      </div>
    </div>
  )
}
