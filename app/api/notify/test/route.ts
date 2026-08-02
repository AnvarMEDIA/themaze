import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { sendTelegram, telegramConfigured, escapeHtml } from '@/lib/notify'
import { SITE_URL } from '@/lib/seo'

export const dynamic = 'force-dynamic'

/** Reports whether inquiry alerts are wired up, without exposing the token. */
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  return NextResponse.json({ configured: telegramConfigured() })
}

/**
 * Sends a test message so the studio can confirm alerts actually arrive —
 * the check that was missing when a real inquiry went unnoticed.
 */
export async function POST() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (!telegramConfigured()) {
    return NextResponse.json({ ok: false, configured: false, error: 'not_configured' }, { status: 400 })
  }

  const result = await sendTelegram(
    [
      '✅ <b>Проверка уведомлений</b>',
      '',
      'Если вы видите это сообщение — заявки с сайта будут приходить сюда.',
      '',
      `<a href="${escapeHtml(SITE_URL)}/admin/inquiries">Заявки в админке</a>`,
    ].join('\n'),
  )

  return NextResponse.json(result, { status: result.ok ? 200 : 502 })
}
