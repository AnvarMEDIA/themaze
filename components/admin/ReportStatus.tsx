'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { DigestRun } from '@/lib/digest'
import { pluralRu } from '@/lib/utils'

/**
 * The dashboard's two status lines: does the daily report go out, and does
 * the site's own counter answer.
 *
 * The report line says whether it can arrive at all (bot and CRON_SECRET),
 * what the last run did, and offers to send it now. The counter line is a
 * real read of today's numbers, not a look at whether a variable is set: a
 * store that is configured but unreachable is exactly what this is for.
 */

interface RunsReply { cronSecretConfigured: boolean; telegramConfigured: boolean; runs: DigestRun[] }
interface TodayReply { days: Array<{ visitors: number; views: number; leads: number }>; online: number }

const TZ = 'Asia/Tashkent'
const nf = new Intl.NumberFormat('ru-RU')

const when = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const dayOf = (date: string) => `${date.slice(8, 10)}.${date.slice(5, 7)}`

function why(reason: string | undefined): string {
  if (!reason) return 'причина не записана'
  if (reason === 'telegram_not_configured') return 'бот не настроен'
  if (reason === 'already_sent') return 'уже был отправлен'
  if (reason.startsWith('build_failed')) return `отчёт не собрался: ${reason.replace(/^build_failed:\s*/, '')}`
  return reason
}

function figures(c: DigestRun['counts']): string {
  if (!c) return ''
  return ` · ${nf.format(c.visitors)} чел. · ${nf.format(c.leads)} ${pluralRu(c.leads, 'заявка', 'заявки', 'заявок')}`
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  const body = await res.json().catch(() => ({})) as T & { error?: string }
  if (!res.ok) throw new Error(body.error || `ошибка ${res.status}`)
  return body
}

type Tone = 'good' | 'warn' | 'bad' | 'wait'
const TONE: Record<Tone, { dot: string; mark: string }> = {
  good: { dot: '#8FC748', mark: '✓' },
  warn: { dot: '#FFD447', mark: '!' },
  bad:  { dot: '#E27A5C', mark: '✗' },
  wait: { dot: '#333333', mark: '·' },
}

function Line({ tone, title, children, actions }: { tone: Tone; title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-x-4 gap-y-3 py-4 first:pt-0 last:pb-0">
      <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: TONE[tone].dot }} />
      <div className="min-w-0 flex-1 basis-[240px]">
        <p className="text-[14px] font-semibold text-white">
          <span className="sr-only">{TONE[tone].mark} </span>{title}
        </p>
        <div className="mt-1 space-y-1 text-[12px] leading-relaxed text-[#8A8A8A]">{children}</div>
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  )
}

export function ReportStatus() {
  const [runs, setRuns] = useState<RunsReply | null>(null)
  const [runsError, setRunsError] = useState('')
  const [today, setToday] = useState<TodayReply | null>(null)
  const [storeError, setStoreError] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [r, s] = await Promise.allSettled([
      getJson<RunsReply>('/api/cron/daily-digest?runs=1'),
      getJson<TodayReply>('/api/analytics/stats?period=today'),
    ])
    if (r.status === 'fulfilled') { setRuns(r.value); setRunsError('') }
    else setRunsError(r.reason instanceof Error ? r.reason.message : 'не удалось прочитать')
    if (s.status === 'fulfilled') { setToday(s.value); setStoreError('') }
    else setStoreError(s.reason instanceof Error ? s.reason.message : 'не удалось прочитать')
  }, [])

  useEffect(() => { void load() }, [load])

  const call = async (send: boolean) => {
    setBusy(true)
    try {
      // No date: the endpoint's default is the day that just ended, the one
      // the schedule sends, so the button and the schedule cannot disagree.
      const data = await getJson<{ sent?: boolean; preview?: string; reason?: string }>(
        `/api/cron/daily-digest${send ? '?send=1' : ''}`,
      )
      if (send) {
        if (data.sent) toast.success('Отчёт отправлен в Telegram')
        else toast.error(`Не отправлено: ${why(data.reason)}`)
        await load()
      } else {
        setPreview(data.preview ?? `(${why(data.reason)})`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Запрос не удался')
    } finally {
      setBusy(false)
    }
  }

  const last = runs?.runs[0]
  const reportTone: Tone = !runs ? (runsError ? 'bad' : 'wait')
    : !runs.telegramConfigured ? 'bad'
    : last && !last.sent && last.via !== 'admin' ? 'bad'
    : !runs.cronSecretConfigured ? 'warn'
    : 'good'
  const reportTitle = !runs
    ? (runsError ? 'Статистика за день — состояние неизвестно' : 'Статистика за день')
    : !runs.telegramConfigured ? 'Статистика за день — не работает'
    : 'Статистика за день — по расписанию'

  const day = today?.days[today.days.length - 1]

  const button = 'rounded-lg px-3 py-2 text-[13px] transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.97] disabled:opacity-50'

  return (
    <section className="mb-8 rounded-xl border border-[#1E1E1E] bg-[#0D0D0D] p-5" aria-labelledby="report-status-title">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="report-status-title" className="text-sm font-semibold text-white">Статистика и ежедневный отчёт</h2>
        <Link href="/admin/stats" className="text-xs text-[#777] transition-colors duration-150 hover:text-[#C8FF47]">
          Открыть статистику →
        </Link>
      </div>

      <div className="divide-y divide-[#171717]">
        <Line
          tone={reportTone}
          title={reportTitle}
          actions={
            <>
              <button type="button" onClick={() => call(false)} disabled={busy}
                className={`${button} border border-[#2A2A2A] bg-[#161616] font-medium text-[#bbb] hover:border-[#333] hover:text-white`}>
                Показать текст
              </button>
              <button type="button" onClick={() => call(true)} disabled={busy || (runs !== null && !runs.telegramConfigured)}
                className={`${button} bg-[#C8FF47] font-bold text-[#0A0A0A] hover:bg-[#F0EEE6]`}>
                Отправить сейчас
              </button>
            </>
          }
        >
          {runsError && <p className="text-[#E27A5C]">Не удалось узнать состояние: {runsError}</p>}
          {runs && !runs.telegramConfigured && (
            <p className="text-[#E27A5C]">
              Бот не настроен: задайте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в Vercel → Settings → Environment Variables и сделайте redeploy.
            </p>
          )}
          {runs?.telegramConfigured && (
            <p>Каждый день в 00:05 по Ташкенту — за прошедшие сутки, в тот же чат Telegram, что и заявки.</p>
          )}
          {runs?.telegramConfigured && !runs.cronSecretConfigured && (
            <p className="text-[#FFD447]">
              CRON_SECRET не задан: расписание узнаётся по признаку Vercel. Задайте CRON_SECRET в Vercel, чтобы адрес отчёта был закрыт.
            </p>
          )}
          {runs && (
            last ? (
              <p>
                Последний запуск: {when(last.at)} —{' '}
                {last.sent
                  ? <span className="text-[#8FC748]">отправлен</span>
                  : <span className="text-[#E27A5C]">не отправлен ({why(last.reason)})</span>}
                {' '}· за {dayOf(last.date)}{figures(last.counts)}
              </p>
            ) : (
              <p>Запусков ещё не было. Первый — сегодня в 00:05 по Ташкенту.</p>
            )
          )}
        </Line>

        <Line
          tone={today ? 'good' : storeError ? 'bad' : 'wait'}
          title={storeError ? 'Статистика — собственная: база не отвечает' : 'Статистика — собственная'}
        >
          {storeError && <p className="text-[#E27A5C]">{storeError}</p>}
          {today && day && (
            <p>
              База отвечает. Сегодня {nf.format(day.visitors)} чел., {nf.format(day.views)}{' '}
              {pluralRu(day.views, 'просмотр', 'просмотра', 'просмотров')} · сейчас на сайте {nf.format(today.online)}
            </p>
          )}
          {!today && !storeError && <p>Проверяем…</p>}
        </Line>
      </div>

      {preview !== null && (
        <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-[#252525] bg-[#111] p-4 text-[12px] leading-relaxed text-[#EDEBE3]">
          {preview.replace(/<\/?[bi]>/g, '')}
        </pre>
      )}

      {runs && runs.runs.length > 1 && (
        <details className="mt-4">
          <summary className="w-fit cursor-pointer select-none text-[12px] text-[#777] transition-colors duration-150 hover:text-white">
            Последние запуски
          </summary>
          <ul className="mt-2 divide-y divide-[#161616] border-y border-[#161616]">
            {runs.runs.slice(0, 7).map((r) => (
              <li key={r.at} className="flex items-baseline gap-3 py-2 text-[12px]">
                <span className={`shrink-0 ${r.sent ? 'text-[#8FC748]' : 'text-[#E27A5C]'}`}>{r.sent ? '✓' : '✗'}</span>
                <span className="w-28 shrink-0 tabular-nums text-[#999]">{when(r.at)}</span>
                <span className="w-16 shrink-0 text-[#777]">за {dayOf(r.date)}</span>
                <span className="min-w-0 truncate text-[#6B6B6B]">
                  {r.sent ? (r.via === 'admin' ? 'кнопкой' : 'по расписанию') : why(r.reason)}{figures(r.counts)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
