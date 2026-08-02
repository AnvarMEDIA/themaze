/**
 * Outbound notifications for new contact-form inquiries.
 *
 * Configured with two environment variables (never stored in the KV store —
 * a bot token is a credential):
 *
 *   TELEGRAM_BOT_TOKEN  from @BotFather
 *   TELEGRAM_CHAT_ID    the chat/group/channel to post into
 *
 * Design rules, learned from the 30 July inquiry that nobody was told about:
 *  - Notifying must NEVER break or delay saving an inquiry. The caller saves
 *    first and treats a failure here as non-fatal.
 *  - It must not fail *silently*: every attempt returns a result the caller
 *    records on the inquiry, so a broken bot is visible in the admin panel
 *    instead of costing another lead.
 *  - It is awaited (with a short timeout) rather than fired-and-forgotten,
 *    because work started after a serverless response may never run.
 */

const API = 'https://api.telegram.org'
const TIMEOUT_MS = 6000

export interface NotifyResult {
  ok: boolean
  /** Short reason, safe to persist and show in the admin UI. */
  error?: string
  /** False when the integration simply isn't set up yet. */
  configured: boolean
}

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
}

/** Escape the small set of characters Telegram's HTML parse mode cares about. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function sendTelegram(html: string): Promise<NotifyResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return { ok: false, configured: false, error: 'not_configured' }
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      cache: 'no-store',
      signal: ctrl.signal,
    })
    if (!res.ok) {
      // Telegram explains failures in the body (bad token, bot not in chat,
      // wrong chat id…). Keep it short but specific enough to act on.
      const body = (await res.text().catch(() => '')).slice(0, 300)
      let reason = `${res.status}`
      try {
        const j = JSON.parse(body) as { description?: string }
        if (j.description) reason = `${res.status}: ${j.description}`
      } catch { if (body) reason = `${res.status}: ${body}` }
      console.error('[notify] Telegram send failed —', reason)
      return { ok: false, configured: true, error: reason }
    }
    return { ok: true, configured: true }
  } catch (err) {
    const reason = err instanceof Error
      ? (err.name === 'AbortError' ? 'timeout' : err.message)
      : 'unknown error'
    console.error('[notify] Telegram send failed —', reason)
    return { ok: false, configured: true, error: reason.slice(0, 200) }
  } finally {
    clearTimeout(timer)
  }
}

export interface InquiryLike {
  name: string
  email: string
  phone?: string
  company?: string
  service?: string
  budget?: string
  message: string
}

/** Build the message posted to Telegram for a new inquiry. */
export function formatInquiry(i: InquiryLike, siteUrl: string): string {
  const e = escapeHtml
  const rows: string[] = [`👤 <b>${e(i.name)}</b>`]
  if (i.company?.trim()) rows.push(`🏢 ${e(i.company)}`)
  rows.push(`✉️ ${e(i.email)}`)
  if (i.phone?.trim())   rows.push(`📞 ${e(i.phone)}`)
  if (i.service?.trim()) rows.push(`🎯 ${e(i.service)}`)
  if (i.budget?.trim())  rows.push(`💰 ${e(i.budget)}`)

  return [
    '🔔 <b>Новая заявка с сайта</b>',
    '',
    rows.join('\n'),
    '',
    `💬 ${e(i.message)}`,
    '',
    `<a href="${e(siteUrl)}/admin/inquiries">Открыть в админке</a>`,
  ].join('\n')
}

/* ── Brief ───────────────────────────────────────────────────────────────
 * The brief form stores option IDs, not labels, and the server has no access
 * to the next-intl messages — so the IDs are resolved here for a readable
 * message.
 */

const STYLE_LABELS: Record<string, string> = {
  bold: 'Bold & Powerful', minimal: 'Minimal & Clean', playful: 'Playful & Friendly',
  classic: 'Classic & Timeless', tech: 'Technical & Modern', luxury: 'Luxurious & Premium',
  organic: 'Organic & Natural', abstract: 'Abstract & Expressive',
}
const COLOR_LABELS: Record<string, string> = {
  dark: 'Dark & Moody', light: 'Light & Clean', vibrant: 'Vibrant & Electric',
  earthy: 'Earthy & Warm', natural: 'Natural & Green', mono: 'Monochrome',
}
const SERVICE_LABELS: Record<string, string> = {
  branding: 'Branding', rebranding: 'Rebranding', identity: 'Visual Identity',
  naming: 'Naming', packaging: 'Packaging', 'ui-ux': 'UI / UX Design',
  print: 'Print & Packaging', motion: 'Motion Design', strategy: 'Brand Strategy',
  unsure: 'Not sure yet',
}

const truncate = (s: string, max: number) =>
  s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`

const resolveList = (ids: string[] | undefined, labels: Record<string, string>) =>
  (ids ?? []).map((id) => labels[id] ?? id).filter(Boolean).join(', ')

export interface BriefLike {
  name: string
  email?: string
  phone?: string
  company?: string
  website?: string
  services?: string[]
  description: string
  goals?: string
  audience?: string
  competitors?: string
  styles?: string[]
  colors?: string[]
  refLinks?: string
  timeline?: string
  budget?: string
  source?: string
  notes?: string
}

export function formatBrief(b: BriefLike, siteUrl: string): string {
  const e = escapeHtml
  const out: string[] = ['📋 <b>Новый бриф с сайта</b>', '']

  out.push(`👤 <b>${e(b.name)}</b>${b.company?.trim() ? ` — ${e(b.company)}` : ''}`)
  if (b.phone?.trim())   out.push(`📞 ${e(b.phone)}`)
  if (b.email?.trim())   out.push(`✉️ ${e(b.email)}`)
  if (b.website?.trim()) out.push(`🌐 ${e(b.website)}`)

  out.push('', '📦 <b>Проект</b>')
  const services = resolveList(b.services, SERVICE_LABELS)
  if (services) out.push(`Услуги: ${e(services)}`)
  out.push(e(truncate(b.description, 1500)))
  if (b.goals?.trim())       out.push('', `<b>Цели:</b> ${e(truncate(b.goals, 500))}`)
  if (b.audience?.trim())    out.push(`<b>Аудитория:</b> ${e(truncate(b.audience, 400))}`)
  if (b.competitors?.trim()) out.push(`<b>Конкуренты:</b> ${e(truncate(b.competitors, 400))}`)

  const styles = resolveList(b.styles, STYLE_LABELS)
  const colors = resolveList(b.colors, COLOR_LABELS)
  if (styles || colors || b.refLinks?.trim()) {
    out.push('', '🎨 <b>Визуальное направление</b>')
    if (styles) out.push(`Стилистика: ${e(styles)}`)
    if (colors) out.push(`Цвета: ${e(colors)}`)
    if (b.refLinks?.trim()) out.push(`Референсы: ${e(truncate(b.refLinks, 500))}`)
  }

  if (b.timeline?.trim() || b.budget?.trim() || b.source?.trim() || b.notes?.trim()) {
    out.push('', '⏱ <b>Сроки и бюджет</b>')
    if (b.timeline?.trim()) out.push(`Сроки: ${e(b.timeline)}`)
    if (b.budget?.trim())   out.push(`Бюджет: ${e(b.budget)}`)
    if (b.source?.trim())   out.push(`Откуда узнали: ${e(b.source)}`)
    if (b.notes?.trim())    out.push(`Заметки: ${e(truncate(b.notes, 500))}`)
  }

  out.push('', `<a href="${e(siteUrl)}/admin/briefs">Открыть в админке</a>`)
  // Telegram caps a message at 4096 characters.
  return truncate(out.join('\n'), 3900)
}

/** Notify about a new brief. Never throws. */
export async function notifyNewBrief(b: BriefLike, siteUrl: string): Promise<NotifyResult> {
  try {
    return await sendTelegram(formatBrief(b, siteUrl))
  } catch (err) {
    console.error('[notify] unexpected failure', err)
    return { ok: false, configured: telegramConfigured(), error: 'unexpected' }
  }
}

/** Notify about a new inquiry. Never throws. */
export async function notifyNewInquiry(i: InquiryLike, siteUrl: string): Promise<NotifyResult> {
  try {
    return await sendTelegram(formatInquiry(i, siteUrl))
  } catch (err) {
    console.error('[notify] unexpected failure', err)
    return { ok: false, configured: telegramConfigured(), error: 'unexpected' }
  }
}
