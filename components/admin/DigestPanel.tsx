'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import type { DigestRun } from '@/lib/digest'

/**
 * Whether the evening report went out, and why not.
 *
 * This lives on the Statistics page because that is where someone wondering
 * "did the report come?" already is. The same log was only readable by
 * hand-typing an API URL while signed in, which is how two evenings passed
 * with the answer sitting in a store nobody could see.
 */
export function DigestPanel({
  runs,
  cronSecretConfigured,
  telegramConfigured,
  timeZone,
}: {
  runs: DigestRun[]
  cronSecretConfigured: boolean
  telegramConfigured: boolean
  timeZone: string
}) {
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const call = async (send: boolean) => {
    setBusy(true)
    try {
      // Both buttons act on the day the cron would report on — today, in the
      // studio's timezone. The endpoint defaults an admin to YESTERDAY, which
      // is right for a morning look at a finished day and wrong for a button
      // labelled "send now", so the day is named explicitly here.
      const day = new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())
      const res = await fetch(
        `/api/cron/daily-digest?date=${day}${send ? '&send=1' : ''}`,
        { cache: 'no-store' },
      )
      const data = await res.json() as { sent?: boolean; preview?: string; reason?: string; date?: string }
      if (send) {
        if (data.sent) { toast.success('Отчёт отправлен в Telegram'); location.reload() }
        else toast.error(`Не отправлено: ${data.reason ?? 'причина неизвестна'}`)
      } else {
        setPreview(data.preview ?? `(${data.reason ?? 'пусто'})`)
      }
    } catch {
      toast.error('Запрос не удался')
    } finally {
      setBusy(false)
    }
  }

  const last = runs[0]
  const when = (iso: string) =>
    new Date(iso).toLocaleString('ru-RU', { timeZone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <section className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-5 mb-10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Ежедневный отчёт в Telegram</h2>
          <p className="text-xs text-[#555] mt-1">
            Уходит каждый день в 23:55 по Ташкенту, в тот же чат, что и заявки.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => call(false)}
            disabled={busy}
            className="px-3 py-2 rounded-lg border border-[#2A2A2A] bg-[#161616] text-[13px] font-medium text-[#bbb] hover:text-white hover:border-[#333] transition-colors duration-150 active:scale-[0.97] disabled:opacity-50"
          >
            Показать текст
          </button>
          <button
            onClick={() => call(true)}
            disabled={busy}
            className="px-3 py-2 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-[13px] font-bold hover:bg-[#F0EEE6] transition-colors duration-150 active:scale-[0.97] disabled:opacity-50"
          >
            Отправить сейчас
          </button>
        </div>
      </div>

      {/* The two settings that decide whether anything can arrive at all. */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] mb-4">
        <span className={telegramConfigured ? 'text-[#8FC748]' : 'text-[#E27A5C]'}>
          {telegramConfigured ? '✓ бот настроен' : '✗ бот не настроен (TELEGRAM_BOT_TOKEN / CHAT_ID)'}
        </span>
        <span className={cronSecretConfigured ? 'text-[#8FC748]' : 'text-[#FFD447]'}>
          {cronSecretConfigured
            ? '✓ CRON_SECRET задан'
            : '— CRON_SECRET не задан: вызовы принимаются по сигналу Vercel'}
        </span>
      </div>

      {preview !== null && (
        <pre className="mb-4 max-h-64 overflow-auto rounded-lg bg-[#111] border border-[#252525] p-4 text-[12px] leading-relaxed text-[#EDEBE3] whitespace-pre-wrap">
          {preview.replace(/<\/?[bi]>/g, '')}
        </pre>
      )}

      {runs.length === 0 ? (
        <p className="text-[13px] text-[#666]">
          Запусков пока не записано. Если вечер уже прошёл — значит вызов не дошёл до сайта:
          проверьте, что крон включён и деплой продакшена свежий.
        </p>
      ) : (
        <>
          <p className="text-[12px] text-[#777] mb-2">
            Последний запуск: {when(last.at)} — {last.sent ? 'отправлен' : `не отправлен (${last.reason ?? '—'})`}
          </p>
          <ul className="divide-y divide-[#161616] border-y border-[#161616]">
            {runs.slice(0, 7).map((r) => (
              <li key={r.at} className="flex items-baseline gap-3 py-2 text-[12px]">
                <span className={`shrink-0 ${r.sent ? 'text-[#8FC748]' : 'text-[#E27A5C]'}`}>
                  {r.sent ? '✓' : '✗'}
                </span>
                <span className="text-[#999] tabular-nums shrink-0 w-28">{when(r.at)}</span>
                <span className="text-[#777] shrink-0 w-24">за {r.date}</span>
                <span className="text-[#5F5F5F] truncate">
                  {r.sent ? `через ${r.via}` : (r.reason ?? '—')}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
