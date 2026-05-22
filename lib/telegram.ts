/**
 * Telegram notifications — pings the studio chat whenever a public
 * form is submitted (contact inquiry or full client brief).
 *
 * Setup:
 *   1. Talk to @BotFather on Telegram, create a bot, copy its token.
 *   2. Add the bot to the target group/channel (or DM it from your
 *      account). Send any message in the chat.
 *   3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` in a
 *      browser. The numeric `chat.id` for your chat appears in the
 *      response — copy it (group IDs are negative).
 *   4. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in the
 *      environment. Without them, this module no-ops and never
 *      blocks form submission.
 *
 * The send is awaited but wrapped — a Telegram failure must never
 * break a public form POST, same contract as the IndexNow helper.
 */

const TELEGRAM_API   = 'https://api.telegram.org'
const TG_MAX_LENGTH  = 4000  // 4096 hard cap, leave headroom
const SITE_URL       = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz'

/* ── Label maps — server has no access to next-intl messages, so we
 *    resolve stored IDs to human labels here. Duplicates the maps in
 *    app/admin/briefs/page.tsx on purpose (admin uses them too). ── */

const STYLE_LABELS: Record<string, string> = {
  bold:     'Bold & Powerful',
  minimal:  'Minimal & Clean',
  playful:  'Playful & Friendly',
  classic:  'Classic & Timeless',
  tech:     'Technical & Modern',
  luxury:   'Luxurious & Premium',
  organic:  'Organic & Natural',
  abstract: 'Abstract & Expressive',
}

const COLOR_LABELS: Record<string, string> = {
  dark:    'Dark & Moody',
  light:   'Light & Clean',
  vibrant: 'Vibrant & Electric',
  earthy:  'Earthy & Warm',
  natural: 'Natural & Green',
  mono:    'Monochrome',
}

const SERVICE_LABELS: Record<string, string> = {
  branding:   'Branding',
  rebranding: 'Rebranding',
  identity:   'Visual Identity',
  naming:     'Naming',
  packaging:  'Packaging',
  'ui-ux':    'UI / UX Design',
  print:      'Print & Packaging',
  motion:     'Motion Design',
  strategy:   'Brand Strategy',
  unsure:     'Not sure yet',
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function esc(s: string | undefined | null): string {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1).trimEnd() + '…'
}

function resolveList(ids: string[] | undefined, map: Record<string, string>): string {
  if (!ids?.length) return ''
  return ids.map((id) => map[id] ?? id).join(', ')
}

/* ── Send ────────────────────────────────────────────────────────────── */

export async function notifyTelegram(text: string): Promise<{ ok: boolean }> {
  const token  = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim()

  if (!token || !chatId) {
    // Not configured — silent no-op so dev / preview deployments don't
    // log noisy warnings on every form submit.
    return { ok: false }
  }

  const payload = truncate(text, TG_MAX_LENGTH)

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        chat_id:                  chatId,
        text:                     payload,
        parse_mode:               'HTML',
        disable_web_page_preview: true,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.warn('[telegram]', res.status, body)
      return { ok: false }
    }
    return { ok: true }
  } catch (err) {
    console.warn('[telegram] fetch failed', err)
    return { ok: false }
  }
}

/* ── Formatters ──────────────────────────────────────────────────────── */

interface InquiryShape {
  name:     string
  email:    string
  phone?:   string
  company?: string
  service?: string
  budget?:  string
  message:  string
}

export function formatInquiry(i: InquiryShape): string {
  const out: string[] = []
  out.push('📩 <b>New inquiry</b>')
  out.push('')
  out.push(`👤 <b>${esc(i.name)}</b>`)
  out.push(`✉️ <a href="mailto:${esc(i.email)}">${esc(i.email)}</a>`)
  if (i.phone)   out.push(`📞 <a href="tel:${esc(i.phone)}">${esc(i.phone)}</a>`)
  if (i.company) out.push(`🏢 ${esc(i.company)}`)
  if (i.service) out.push(`🎯 ${esc(i.service)}`)
  if (i.budget)  out.push(`💰 ${esc(i.budget)}`)
  out.push('')
  out.push('💬 <b>Message</b>')
  out.push(esc(truncate(i.message, 2000)))
  out.push('')
  out.push(`<a href="${SITE_URL}/admin/inquiries">Open in admin →</a>`)
  return out.join('\n')
}

interface BriefShape {
  name:         string
  email?:       string
  phone?:       string
  company?:     string
  website?:     string
  services?:    string[]
  description:  string
  goals?:       string
  audience?:    string
  competitors?: string
  styles?:      string[]
  colors?:      string[]
  refLinks?:    string
  timeline?:    string
  budget?:      string
  source?:      string
  notes?:       string
}

export function formatBrief(b: BriefShape): string {
  const out: string[] = []
  out.push('📋 <b>New brief</b>')
  out.push('')

  // Contact
  out.push(`👤 <b>${esc(b.name)}</b>${b.company ? ` — ${esc(b.company)}` : ''}`)
  if (b.phone)   out.push(`📞 <a href="tel:${esc(b.phone)}">${esc(b.phone)}</a>`)
  if (b.email)   out.push(`✉️ <a href="mailto:${esc(b.email)}">${esc(b.email)}</a>`)
  if (b.website) out.push(`🌐 ${esc(b.website)}`)

  // Project
  out.push('')
  out.push('📦 <b>Project</b>')
  const services = resolveList(b.services, SERVICE_LABELS)
  if (services) out.push(`Services: ${esc(services)}`)
  out.push(esc(truncate(b.description, 1500)))
  if (b.goals)       { out.push(''); out.push(`<b>Goals:</b> ${esc(truncate(b.goals, 500))}`) }
  if (b.audience)    { out.push(`<b>Audience:</b> ${esc(truncate(b.audience, 400))}`) }
  if (b.competitors) { out.push(`<b>Competitors:</b> ${esc(truncate(b.competitors, 400))}`) }

  // Visual direction
  const styles = resolveList(b.styles, STYLE_LABELS)
  const colors = resolveList(b.colors, COLOR_LABELS)
  if (styles || colors || b.refLinks) {
    out.push('')
    out.push('🎨 <b>Visual direction</b>')
    if (styles)     out.push(`Aesthetic: ${esc(styles)}`)
    if (colors)     out.push(`Colour mood: ${esc(colors)}`)
    if (b.refLinks) out.push(`References: ${esc(truncate(b.refLinks, 500))}`)
  }

  // Timeline & budget
  if (b.timeline || b.budget || b.source || b.notes) {
    out.push('')
    out.push('⏱ <b>Timeline & budget</b>')
    if (b.timeline) out.push(`Timeline: ${esc(b.timeline)}`)
    if (b.budget)   out.push(`Budget: ${esc(b.budget)}`)
    if (b.source)   out.push(`Source: ${esc(b.source)}`)
    if (b.notes)    out.push(`Notes: ${esc(truncate(b.notes, 500))}`)
  }

  out.push('')
  out.push(`<a href="${SITE_URL}/admin/briefs">Open in admin →</a>`)

  return out.join('\n')
}
