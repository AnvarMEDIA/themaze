/**
 * Talking back to Telegram: the small slice of the Bot API this needs, and
 * the messages the bot sends.
 *
 * Replies are in Russian, because that is the language the owner writes their
 * spending in. The admin panel's own EN/RU toggle belongs to the browser and
 * has no meaning in a chat.
 */
import { formatMoney } from '../../finance/money'
import { escapeHtml } from '../../notify'
import type { Currency } from '../../finance/types'
import type { MfcCategory, MfcExpense } from '../types'
import { botToken } from './config'

/**
 * Overridable so the bot can be pointed at a stub — the outbound half of this
 * is most of the behaviour, and the only way to assert on it is to have
 * somewhere to send it. Unset everywhere but a test run.
 */
const API = process.env.TELEGRAM_API_BASE || 'https://api.telegram.org'
const TIMEOUT_MS = 6000

export interface InlineButton { text: string; callback_data: string }

async function call(method: string, body: Record<string, unknown>): Promise<boolean> {
  const token = botToken()
  if (!token) return false
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${API}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: ctrl.signal,
    })
    if (!res.ok) {
      console.error(`[mfc-tg] ${method} failed —`, (await res.text().catch(() => '')).slice(0, 200))
      return false
    }
    return true
  } catch (err) {
    console.error(`[mfc-tg] ${method} failed —`, err instanceof Error ? err.message : 'unknown')
    return false
  } finally {
    clearTimeout(timer)
  }
}

export async function reply(
  chatId: number,
  html: string,
  buttons?: InlineButton[][],
): Promise<boolean> {
  return call('sendMessage', {
    chat_id: chatId,
    text: html,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(buttons?.length ? { reply_markup: { inline_keyboard: buttons } } : {}),
  })
}

/** Clears the spinner on a tapped button; the toast is optional. */
export async function answerCallback(id: string, text?: string): Promise<boolean> {
  return call('answerCallbackQuery', { callback_query_id: id, ...(text ? { text } : {}) })
}

export async function editMessage(
  chatId: number,
  messageId: number,
  html: string,
): Promise<boolean> {
  return call('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text: html,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  })
}

/* ── webhook registration ───────────────────────────────────────────────── */

export interface WebhookInfo {
  url?: string
  pending_update_count?: number
  last_error_message?: string
  last_error_date?: number
}

async function get<T>(method: string): Promise<T | null> {
  const token = botToken()
  if (!token) return null
  try {
    const res = await fetch(`${API}/bot${token}/${method}`, { cache: 'no-store' })
    if (!res.ok) return null
    const body = await res.json() as { ok: boolean; result: T }
    return body.ok ? body.result : null
  } catch {
    return null
  }
}

export const getWebhookInfo = () => get<WebhookInfo>('getWebhookInfo')

export async function setWebhook(url: string, secret: string): Promise<boolean> {
  return call('setWebhook', {
    url,
    secret_token: secret,
    // Only what this needs. Anything else Telegram might add stays undelivered
    // rather than arriving at an endpoint with no idea what to do with it.
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  })
}

export const deleteWebhook = () => call('deleteWebhook', { drop_pending_updates: true })

/* ── the messages ───────────────────────────────────────────────────────── */

const e = escapeHtml
const money = (v: number, c: Currency) => formatMoney(v, c, { locale: 'ru-RU' })

/** "8 сент." — a date a person reads, built without parsing as local time. */
export function ruDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', timeZone: 'UTC',
  })
}

export function confirmation(
  row: MfcExpense,
  category: MfcCategory | undefined,
  today: string,
  baseValue: number | null,
  baseCurrency: Currency,
): string {
  const lines = [
    `✅ <b>${e(money(row.amount, row.currency))}</b>` +
      (category ? ` · ${e(category.icon)} ${e(category.nameRu?.trim() || category.name)}` : ' · <i>без категории</i>'),
  ]
  // Only when it says something the first line does not.
  if (row.currency !== baseCurrency && baseValue !== null) {
    lines.push(`≈ ${e(money(baseValue, baseCurrency))}`)
  }
  if (row.date !== today) lines.push(`📅 ${e(ruDate(row.date))}`)
  if (row.note) lines.push(`📝 ${e(row.note)}`)
  return lines.join('\n')
}

export function helpText(baseCurrency: Currency): string {
  return [
    '💸 <b>Личные расходы</b>',
    '',
    'Просто напишите трату — порядок слов любой:',
    '<code>такси 25000</code>',
    '<code>25к продукты</code>',
    '<code>вчера кафе 45 000 обед с Аброром</code>',
    '<code>20$ подписка</code>',
    '',
    `Валюта по умолчанию — ${e(baseCurrency)}. Суффиксы: <code>к</code> — тысячи, <code>м</code> — миллионы.`,
    'Дата: <code>вчера</code>, <code>позавчера</code>, <code>5.09</code>.',
    'Категория ищется по названию или по слову вроде «такси», «кофе», «бензин».',
    '',
    '<b>Команды</b>',
    '/today — что потрачено сегодня',
    '/month — итоги месяца',
    '/cats — список категорий',
    '/undo — удалить последнюю запись',
  ].join('\n')
}

export function notRecognised(reason: 'no-amount' | 'bad-amount' | 'empty'): string {
  const why = reason === 'no-amount'
    ? 'Не нашёл сумму.'
    : reason === 'bad-amount'
      ? 'Сумма не похожа на число.'
      : 'Пустое сообщение.'
  return `🤔 ${why}\nНапример: <code>такси 25000</code>\n/help — как ещё можно писать`
}

export function dayReport(
  rows: Array<{ row: MfcExpense; category?: MfcCategory; base: number }>,
  total: number,
  baseCurrency: Currency,
  title: string,
): string {
  if (rows.length === 0) return `📊 <b>${e(title)}</b>\nПока ничего не записано.`
  const lines = rows.slice(0, 30).map(({ row, category, base }) =>
    `• ${e(category?.icon ?? '·')} ${e(category?.nameRu?.trim() || category?.name || 'без категории')}` +
    ` — <b>${e(money(base, baseCurrency))}</b>${row.note ? ` <i>${e(row.note)}</i>` : ''}`)
  if (rows.length > 30) lines.push(`…и ещё ${rows.length - 30}`)
  return [
    `📊 <b>${e(title)}</b>`,
    `Итого: <b>${e(money(total, baseCurrency))}</b> · ${rows.length} зап.`,
    '',
    ...lines,
  ].join('\n')
}

export function monthReport(
  total: number,
  perDay: number,
  top: Array<{ name: string; icon: string; total: number; share: number }>,
  baseCurrency: Currency,
  monthLabel: string,
): string {
  const lines = top.map((c) =>
    `• ${e(c.icon)} ${e(c.name)} — <b>${e(money(c.total, baseCurrency))}</b> · ${Math.round(c.share * 100)}%`)
  return [
    `📊 <b>${e(monthLabel)}</b>`,
    `Потрачено: <b>${e(money(total, baseCurrency))}</b>`,
    `В день: ${e(money(perDay, baseCurrency))}`,
    ...(lines.length ? ['', '<b>Куда уходит</b>', ...lines] : []),
  ].join('\n')
}

export function categoriesList(categories: MfcCategory[]): string {
  const rows = categories
    .filter((c) => !c.archived)
    .map((c) => `${e(c.icon)} ${e(c.nameRu?.trim() || c.name)}`)
  return ['🗂 <b>Категории</b>', '', ...rows].join('\n')
}
