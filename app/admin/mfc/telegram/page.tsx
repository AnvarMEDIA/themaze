'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useFinanceLang } from '@/components/admin/finance/lang'
import { unlockHref } from '@/components/admin/finance/mfc/shared'

interface Status {
  hasToken: boolean
  linked: boolean
  linkedAt: string | null
  lastMessageAt: string | null
  timeZone: string
  todayThere: string
  pendingCode: { code: string; expiresAt: string } | null
  webhook: { expected: string; registered: boolean; url: string; pending: number; lastError: string }
}

const ZONES = ['Asia/Tashkent', 'Asia/Almaty', 'Europe/Moscow', 'Asia/Dubai', 'Europe/London', 'UTC']

export default function MfcTelegramPage() {
  const router = useRouter()
  const { t, locale } = useFinanceLang()
  const [st, setSt] = useState<Status | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/finance/mfc/telegram/setup', { cache: 'no-store' })
    if (res.status === 401) { router.push(unlockHref()); return }
    setSt(await res.json())
  }, [router])

  useEffect(() => { load() }, [load])

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(action)
    try {
      const res = await fetch('/api/finance/mfc/telegram/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(t(`tg.err.${body.error ?? 'failed'}`)); return }
      if (action === 'test') toast.success(t('tg.testSent'))
      else { setSt(body); toast.success(t('mfc.saved')) }
    } catch {
      toast.error(t('toast.saveFail'))
    } finally {
      setBusy(null)
    }
  }

  if (!st) {
    return (
      <div className="px-4 sm:px-6 py-6 max-w-[760px] mx-auto">
        <div className="h-8 w-40 bg-[#141414] rounded animate-pulse mb-6" />
        <div className="h-64 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] animate-pulse" />
      </div>
    )
  }

  const ready = st.hasToken && st.linked && st.webhook.registered

  return (
    <div className="px-4 sm:px-6 py-6 pb-16 max-w-[760px] mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{t('tg.title')}</h1>
      <p className="text-sm text-[#555] mt-1 mb-6">{t('tg.subtitle')}</p>

      {/* State, in one line, before any of the machinery. */}
      <div className={`rounded-xl border px-5 py-4 mb-4 flex items-start gap-3 ${
        ready ? 'border-[#C8FF47]/25 bg-[#C8FF47]/[0.05]' : 'border-[#2A2A2A] bg-[#0D0D0D]'
      }`}>
        <span className="text-sm leading-5" aria-hidden="true">{ready ? '✅' : '○'}</span>
        <div className="min-w-0">
          <p className="text-[13px] text-white font-medium">
            {ready ? t('tg.ready') : !st.hasToken ? t('tg.noToken') : !st.webhook.registered ? t('tg.notRegistered') : t('tg.notLinked')}
          </p>
          {!st.hasToken && <p className="text-[12px] text-[#777] mt-1">{t('tg.noTokenHint')}</p>}
          {ready && st.lastMessageAt && (
            <p className="text-[12px] text-[#777] mt-1">
              {t('tg.lastMessage', { when: new Date(st.lastMessageAt).toLocaleString(locale) })}
            </p>
          )}
          {st.webhook.lastError && (
            <p className="text-[12px] text-[#E27A5C] mt-1">{st.webhook.lastError}</p>
          )}
        </div>
      </div>

      {/* Pairing */}
      <section className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-5 mb-4">
        <h2 className="text-sm font-semibold text-white mb-1">{t('tg.connectTitle')}</h2>
        <p className="text-[12px] text-[#777] leading-relaxed mb-4">{t('tg.connectBody')}</p>

        {st.pendingCode ? (
          <div className="rounded-lg border border-[#C8FF47]/30 bg-[#C8FF47]/[0.06] p-4 mb-4">
            <p className="text-[11px] uppercase tracking-[0.1em] text-[#8A8A8A] mb-2">{t('tg.sendThis')}</p>
            <p className="text-[22px] font-bold text-[#C8FF47] tabular-nums tracking-[0.2em] select-all">
              /link {st.pendingCode.code}
            </p>
            <p className="text-[11px] text-[#777] mt-2">
              {t('tg.codeExpires', { when: new Date(st.pendingCode.expiresAt).toLocaleTimeString(locale) })}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => act('connect')}
            disabled={!st.hasToken || busy !== null}
            className="px-4 py-2 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-[13px] font-bold transition-colors duration-150 hover:bg-[#D6FF6E] active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
          >
            {busy === 'connect' ? t('common.saving') : st.linked ? t('tg.reconnect') : t('tg.connect')}
          </button>
          {st.linked && (
            <button
              type="button"
              onClick={() => act('test')}
              disabled={busy !== null}
              className="px-4 py-2 rounded-lg border border-[#2A2A2A] bg-[#161616] text-[13px] font-medium text-[#bbb] hover:text-white hover:border-[#333] transition-colors active:scale-[0.97] disabled:opacity-40"
            >
              {t('tg.test')}
            </button>
          )}
          {(st.linked || st.webhook.registered) && (
            <button
              type="button"
              onClick={() => act('disconnect')}
              disabled={busy !== null}
              className="ml-auto px-3 py-2 rounded-lg text-[13px] text-red-400 hover:bg-red-500/10 transition-colors active:scale-[0.97] disabled:opacity-40"
            >
              {t('tg.disconnect')}
            </button>
          )}
        </div>
      </section>

      {/* Which calendar "today" means */}
      <section className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-5 mb-4">
        <h2 className="text-sm font-semibold text-white mb-1">{t('tg.tzTitle')}</h2>
        <p className="text-[12px] text-[#777] leading-relaxed mb-3">
          {t('tg.tzBody')} <span className="text-[#999]">{t('tg.tzToday', { date: st.todayThere })}</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ZONES.map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => act('timezone', { timeZone: z })}
              disabled={busy !== null}
              aria-pressed={st.timeZone === z}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors active:scale-[0.97] disabled:opacity-40 ${
                st.timeZone === z ? 'bg-[#C8FF47]/12 text-[#C8FF47]' : 'text-[#888] hover:text-white hover:bg-[#161616]'
              }`}
            >
              {z}
            </button>
          ))}
        </div>
      </section>

      {/* What to write */}
      <section className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-5">
        <h2 className="text-sm font-semibold text-white mb-3">{t('tg.howTitle')}</h2>
        <ul className="space-y-2 mb-4">
          {['такси 25000', '25к продукты', 'вчера кафе 45 000 обед с Аброром', '20$ подписка'].map((ex) => (
            <li key={ex} className="text-[13px] text-[#C8FF47] font-mono bg-[#111] rounded-lg px-3 py-2">{ex}</li>
          ))}
        </ul>
        <p className="text-[12px] text-[#777] leading-relaxed">{t('tg.howBody')}</p>
        <p className="text-[12px] text-[#777] leading-relaxed mt-2">{t('tg.learnBody')}</p>
      </section>
    </div>
  )
}
