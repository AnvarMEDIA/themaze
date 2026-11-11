import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { sendTelegram } from '@/lib/notify'
import { claimOnce } from '@/lib/stats/store'
import { siteDay } from '@/lib/stats/time'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * ONE-OFF, to be removed with its vercel.json entry once it has run.
 *
 * The corrected report for 11 November 2026, sent once to the studio's chat
 * by Vercel's scheduler. The nightly report for that day said 17 visitors
 * and 35 views; the store had lost almost every write that day (see
 * lib/stats/backend), and the day cannot be recounted from it. The figures
 * below are from Vercel's request logs (each view is one beacon to the
 * tracker) and from the Google Ads account, as read on 11.11 at 21:00 UTC.
 * Scheduled for 21:25 UTC on 11 November, 02:25 on the 12th in Tashkent.
 *
 * Sends only on 12 November (Tashkent), only once (a flag in Redis), and only
 * for the scheduler's CRON_SECRET.
 */

const DAY = '2026-11-12'

const MESSAGE = [
  '📊 <b>Исправленная сводка за 11.11, среда</b>',
  '',
  'Ночная сводка показала 17 посетителей и 35 просмотров. Это ошибка счётчика, а не посещаемость: в день рекламы он терял почти все записи.',
  '',
  '<b>По логам сервера Vercel, 11.11 по Ташкенту</b>',
  '👁 Просмотров людьми: ≈1 320',
  '🤖 Ещё 180 — роботы поисковиков, почти все Яндекс',
  '🕒 Пик: 15:00 — 251 просмотр; с 12:00 до 14:00 ещё 371',
  '',
  '<b>Google Ads, кампания «MAZE - First», 10–12.11</b>',
  '🖱 Клики: 1 316 из 12 826 показов (CTR 10,26%)',
  '✅ Конверсии «Контакт»: 14, по 1,49 $',
  '💵 Расход: 20,83 $',
  '',
  'Сколько было людей, по логам не восстановить: они считают запросы, а не посетителей.',
  '',
  '🔧 Счётчик исправлен этой ночью: визиты пишутся в базу без потерь, а клики по рекламе видны как «Реклама · Google Ads». Следующая сводка — за 12.11, в 00:05 13.11.',
].join('\n')

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization') ?? ''
  const presented = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!secret || !presented || !safeEqual(presented, secret)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  if (siteDay() !== DAY) return NextResponse.json({ sent: false, reason: 'not the day' })

  let first: boolean
  try {
    first = await claimOnce('correction-2026-11-11', 7 * 86_400)
  } catch (err) {
    return NextResponse.json({ sent: false, reason: err instanceof Error ? err.message : 'store' }, { status: 503 })
  }
  if (!first) return NextResponse.json({ sent: false, reason: 'already sent' })

  const result = await sendTelegram(MESSAGE)
  if (!result.ok) console.error('[stats-correction] Telegram refused:', result.error)
  return NextResponse.json({ sent: result.ok, error: result.ok ? undefined : result.error })
}
