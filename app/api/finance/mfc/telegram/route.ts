import { NextRequest, NextResponse } from 'next/server'
import { getEffectiveFinanceSettings } from '@/lib/finance/settings'
import { txBase, formatMoney } from '@/lib/finance/money'
import { lockFor } from '@/lib/finance/fxLock'
import { resolvePeriod } from '@/lib/finance/period'
import { buildMfcSummary } from '@/lib/mfc/summary'
import {
  listCategories, listExpenses, createExpense, deleteExpense,
  updateExpense, updateCategory,
} from '@/lib/mfc/data'
import { keywordList, parseExpenseMessage } from '@/lib/mfc/telegram/parse'
import {
  getTgConfig, patchTgConfig, linkCodeValid, markSeen, todayIn, botToken,
} from '@/lib/mfc/telegram/config'
import {
  reply, answerCallback, editMessage, confirmation, helpText, notRecognised,
  dayReport, monthReport, categoriesList, ruDate, type InlineButton,
} from '@/lib/mfc/telegram/bot'
import { MFC_DEFAULT_METHOD } from '@/lib/mfc/types'
import type { MfcCategory, MfcExpense } from '@/lib/mfc/types'

export const dynamic = 'force-dynamic'

/* ── the shape of what Telegram sends ───────────────────────────────────── */

interface TgChat { id: number; type: string }
interface TgMessage { message_id: number; chat: TgChat; text?: string }
interface TgCallback {
  id: string
  data?: string
  message?: { message_id: number; chat: TgChat }
}
interface TgUpdate { update_id: number; message?: TgMessage; callback_query?: TgCallback }

/** Telegram stops retrying on a 200, so almost everything answers 200. */
const OK = () => NextResponse.json({ ok: true })

/** An id is passed to a button in eight characters; resolve it back. */
function byPrefix(rows: MfcExpense[], prefix: string): MfcExpense | null {
  const hits = rows.filter((e) => e.id.startsWith(prefix))
  // Two matches means the prefix is not an identity, and guessing which row to
  // delete is not a thing to do with someone's money.
  return hits.length === 1 ? hits[0] : null
}

const label = (c: MfcCategory) => `${c.icon} ${c.nameRu?.trim() || c.name}`

/** Buttons under a fresh entry: undo always, plus a category when none stuck. */
function entryButtons(row: MfcExpense, categories: MfcCategory[]): InlineButton[][] {
  const short = row.id.slice(0, 8)
  const rows: InlineButton[][] = []
  if (!row.categoryId) {
    const offer = categories.filter((c) => !c.archived).slice(0, 6)
    for (let i = 0; i < offer.length; i += 2) {
      rows.push(offer.slice(i, i + 2).map((c) => ({
        text: label(c),
        callback_data: `c:${short}:${c.id}`,
      })))
    }
  }
  rows.push([{ text: '🗑 Удалить', callback_data: `d:${short}` }])
  return rows
}

/**
 * Teach the category the word that was typed.
 *
 * Only a one-word note, and only a word made of letters: "вода" is worth
 * remembering, "обед с Аброром в четверг" is not a label for anything. Next
 * time that word alone will find the category, and the list stays editable
 * in the admin panel.
 */
async function learnKeyword(category: MfcCategory, note: string): Promise<void> {
  const word = note.trim().toLowerCase()
  if (!word || /\s/.test(word) || word.length < 3 || word.length > 24) return
  if (!/^[\p{L}\d'-]+$/u.test(word)) return
  if (keywordList(category.keywords).includes(word)) return
  await updateCategory(category.id, {
    keywords: `${category.keywords ?? ''} ${word}`.trim(),
  })
}

/* ── the webhook ────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const cfg = await getTgConfig()

  // 1. It has to be Telegram. The secret is minted here and registered with
  //    setWebhook, so anyone else posting to this URL has nothing to send.
  if (!cfg.secret || req.headers.get('x-telegram-bot-api-secret-token') !== cfg.secret) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (!botToken()) return OK()

  const update = (await req.json().catch(() => null)) as TgUpdate | null
  if (!update || typeof update.update_id !== 'number') return OK()

  // 2. A redelivery must not file the same expense a second time.
  if (await markSeen(update.update_id)) return OK()

  try {
    if (update.callback_query) await onCallback(update.callback_query)
    else if (update.message) await onMessage(update.message)
  } catch (err) {
    // Never 500: Telegram would redeliver, and the failure would repeat.
    console.error('[mfc-tg] update failed —', err instanceof Error ? err.message : 'unknown')
  }
  return OK()
}

/* ── messages ───────────────────────────────────────────────────────────── */

async function onMessage(msg: TgMessage): Promise<void> {
  const cfg = await getTgConfig()
  const text = (msg.text ?? '').trim()
  if (!text) return

  // 3. Private chats only. A group is a room of people, and this is one
  //    person's spending.
  if (msg.chat.type !== 'private') return

  // 4. Pairing. Until a chat is claimed the bot answers nothing else, and it
  //    never says why — an unknown chat learns nothing about whether the code
  //    it guessed was close.
  if (!cfg.chatId) {
    const code = text.match(/^\/link\s+(\S+)/i)?.[1]
    if (code && linkCodeValid(cfg, code)) {
      await patchTgConfig({
        chatId: msg.chat.id,
        linkedAt: new Date().toISOString(),
        linkCode: undefined,
        linkExpiresAt: undefined,
      })
      const settings = await getEffectiveFinanceSettings()
      await reply(msg.chat.id, `🔗 <b>Подключено.</b>\n\n${helpText(settings.baseCurrency)}`)
    }
    return
  }
  if (msg.chat.id !== cfg.chatId) return

  await patchTgConfig({ lastMessageAt: new Date().toISOString() })

  const [categories, settings] = await Promise.all([listCategories(), getEffectiveFinanceSettings()])
  const today = todayIn(cfg.timeZone)

  /* commands */
  const cmd = text.match(/^\/([a-z]+)/i)?.[1]?.toLowerCase()
  if (cmd && !['add'].includes(cmd)) {
    switch (cmd) {
      case 'start':
      case 'help':
        await reply(msg.chat.id, helpText(settings.baseCurrency)); return
      case 'link':
        await reply(msg.chat.id, '🔗 Уже подключено.'); return
      case 'cats':
      case 'categories':
        await reply(msg.chat.id, categoriesList(categories)); return
      case 'today':
        await sendDay(msg.chat.id, today, 'Сегодня'); return
      case 'yesterday': {
        const y = new Date(`${today}T00:00:00Z`); y.setUTCDate(y.getUTCDate() - 1)
        const d = y.toISOString().slice(0, 10)
        await sendDay(msg.chat.id, d, ruDate(d)); return
      }
      case 'month':
        await sendMonth(msg.chat.id, today); return
      case 'undo':
        await undoLast(msg.chat.id); return
      default:
        await reply(msg.chat.id, helpText(settings.baseCurrency)); return
    }
  }

  /* free text — an expense */
  const parsed = parseExpenseMessage(text, categories, settings.baseCurrency, today)
  if (!parsed.ok) {
    await reply(msg.chat.id, notRecognised(parsed.reason))
    return
  }

  const { amount, currency, date, categoryId, note } = parsed.value
  const lock = await lockFor({ currency, date })
  const row = await createExpense({
    categoryId, amount, currency, date, note, method: MFC_DEFAULT_METHOD, ...(lock ?? {}),
  })

  const category = categories.find((c) => c.id === row.categoryId)
  const base = txBase(row, settings).value
  await reply(
    msg.chat.id,
    confirmation(row, category, today, base, settings.baseCurrency),
    entryButtons(row, categories),
  )
}

/* ── reports ────────────────────────────────────────────────────────────── */

async function sendDay(chatId: number, date: string, title: string): Promise<void> {
  const [rows, categories, settings] = await Promise.all([
    listExpenses(), listCategories(), getEffectiveFinanceSettings(),
  ])
  const byId = new Map(categories.map((c) => [c.id, c]))
  const day = rows.filter((e) => e.date === date)
  const items = day.map((row) => ({
    row,
    category: row.categoryId ? byId.get(row.categoryId) : undefined,
    base: txBase(row, settings).value ?? 0,
  }))
  const total = items.reduce((s, i) => s + i.base, 0)
  await reply(chatId, dayReport(items, total, settings.baseCurrency, title))
}

async function sendMonth(chatId: number, today: string): Promise<void> {
  const [rows, categories, settings] = await Promise.all([
    listExpenses(), listCategories(), getEffectiveFinanceSettings(),
  ])
  // Resolved from the OWNER's today, not this process's — the month they are
  // living in is the one they are asking about.
  const [y, m, d] = today.split('-').map(Number)
  const period = resolvePeriod('month', new Date(y, m - 1, d, 12))
  const sum = buildMfcSummary(rows, categories, settings, period, new Date(y, m - 1, d, 12))
  const monthLabel = new Date(Date.UTC(y, m - 1, 1))
    .toLocaleDateString('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  await reply(chatId, monthReport(
    sum.total,
    sum.dailyAverage,
    sum.categories.slice(0, 6).map((c) => ({
      name: c.nameRu?.trim() || c.name || 'без категории',
      icon: c.icon || '·',
      total: c.total,
      share: c.share,
    })),
    settings.baseCurrency,
    monthLabel,
  ))
}

async function undoLast(chatId: number): Promise<void> {
  const rows = await listExpenses()
  // listExpenses is newest-date-first, but "last recorded" is by entry time —
  // a row backdated to last week is still the one just typed.
  const last = [...rows].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0]
  if (!last) { await reply(chatId, 'Нечего удалять.'); return }
  await deleteExpense(last.id)
  await reply(chatId, `🗑 Удалено: ${formatMoney(last.amount, last.currency, { locale: 'ru-RU' })}` +
    `${last.note ? ` · ${last.note}` : ''}`)
}

/* ── buttons ────────────────────────────────────────────────────────────── */

async function onCallback(cb: TgCallback): Promise<void> {
  const cfg = await getTgConfig()
  const chatId = cb.message?.chat.id
  if (!chatId || chatId !== cfg.chatId) { await answerCallback(cb.id); return }

  const data = cb.data ?? ''
  const rows = await listExpenses()

  if (data.startsWith('d:')) {
    const row = byPrefix(rows, data.slice(2))
    if (!row) { await answerCallback(cb.id, 'Запись уже удалена'); return }
    await deleteExpense(row.id)
    await answerCallback(cb.id, 'Удалено')
    if (cb.message) await editMessage(chatId, cb.message.message_id, '🗑 <s>Удалено</s>')
    return
  }

  if (data.startsWith('c:')) {
    const [, prefix, categoryId] = data.split(':')
    const row = byPrefix(rows, prefix ?? '')
    if (!row) { await answerCallback(cb.id, 'Запись уже удалена'); return }

    const [categories, settings] = await Promise.all([listCategories(), getEffectiveFinanceSettings()])
    const category = categories.find((c) => c.id === categoryId)
    if (!category) { await answerCallback(cb.id, 'Категория не найдена'); return }

    const updated = await updateExpense(row.id, { categoryId: category.id })
    // The word that was not recognised is now worth remembering.
    await learnKeyword(category, row.note)
    await answerCallback(cb.id, label(category))
    if (cb.message && updated) {
      await editMessage(
        chatId,
        cb.message.message_id,
        confirmation(updated, category, todayIn(cfg.timeZone),
          txBase(updated, settings).value, settings.baseCurrency),
      )
    }
    return
  }

  await answerCallback(cb.id)
}
