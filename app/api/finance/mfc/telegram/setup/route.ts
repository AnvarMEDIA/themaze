import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireFinance } from '@/lib/finance/guard'
import { SITE_URL } from '@/lib/seo'
import {
  getTgConfig, patchTgConfig, botToken, mintLinkCode, mintSecret, linkExpiry, todayIn,
} from '@/lib/mfc/telegram/config'
import { getWebhookInfo, setWebhook, deleteWebhook, reply } from '@/lib/mfc/telegram/bot'

export const dynamic = 'force-dynamic'

const WEBHOOK_PATH = '/api/finance/mfc/telegram'

const ActionSchema = z.object({
  action: z.enum(['connect', 'disconnect', 'test', 'timezone']),
  timeZone: z.string().trim().max(64).optional(),
})

/** Never returns the secret or the token — only whether they exist. */
async function status() {
  const cfg = await getTgConfig()
  const hasToken = Boolean(botToken())
  const info = hasToken ? await getWebhookInfo() : null
  const expected = `${SITE_URL}${WEBHOOK_PATH}`
  return {
    hasToken,
    linked: Boolean(cfg.chatId),
    linkedAt: cfg.linkedAt ?? null,
    lastMessageAt: cfg.lastMessageAt ?? null,
    timeZone: cfg.timeZone,
    todayThere: todayIn(cfg.timeZone),
    // The code is shown so it can be typed into the chat; it dies in 15 minutes.
    pendingCode: cfg.linkCode && cfg.linkExpiresAt && Date.parse(cfg.linkExpiresAt) > Date.now()
      ? { code: cfg.linkCode, expiresAt: cfg.linkExpiresAt }
      : null,
    webhook: {
      expected,
      registered: info?.url === expected,
      url: info?.url ?? '',
      pending: info?.pending_update_count ?? 0,
      lastError: info?.last_error_message ?? '',
    },
  }
}

export async function GET() {
  const blocked = await requireFinance()
  if (blocked) return blocked
  return NextResponse.json(await status())
}

export async function POST(req: NextRequest) {
  const blocked = await requireFinance()
  if (blocked) return blocked

  const parsed = ActionSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }
  if (!botToken()) {
    return NextResponse.json({ error: 'no_token' }, { status: 400 })
  }

  switch (parsed.data.action) {
    case 'connect': {
      // A fresh secret each time, so re-connecting invalidates whatever a
      // previous registration knew.
      const secret = mintSecret()
      const url = `${SITE_URL}${WEBHOOK_PATH}`
      const ok = await setWebhook(url, secret)
      if (!ok) return NextResponse.json({ error: 'setwebhook_failed' }, { status: 502 })
      await patchTgConfig({
        secret,
        linkCode: mintLinkCode(),
        linkExpiresAt: linkExpiry(),
        // Re-pairing starts from nobody: the code claims the chat.
        chatId: undefined,
        linkedAt: undefined,
      })
      return NextResponse.json(await status())
    }

    case 'disconnect': {
      await deleteWebhook()
      await patchTgConfig({
        secret: undefined, chatId: undefined, linkCode: undefined,
        linkExpiresAt: undefined, linkedAt: undefined,
      })
      return NextResponse.json(await status())
    }

    case 'test': {
      const cfg = await getTgConfig()
      if (!cfg.chatId) return NextResponse.json({ error: 'not_linked' }, { status: 400 })
      const sent = await reply(cfg.chatId,
        '✅ <b>Проверка связи.</b>\nЗапишите трату сообщением — например <code>такси 25000</code>.')
      return NextResponse.json({ ok: sent })
    }

    case 'timezone': {
      const tz = parsed.data.timeZone?.trim()
      if (!tz) return NextResponse.json({ error: 'no_timezone' }, { status: 400 })
      // Reject a zone Node cannot resolve rather than storing one that would
      // silently fall back to UTC and misdate every "сегодня".
      try { new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date()) }
      catch { return NextResponse.json({ error: 'bad_timezone' }, { status: 400 }) }
      await patchTgConfig({ timeZone: tz })
      return NextResponse.json(await status())
    }
  }
}
