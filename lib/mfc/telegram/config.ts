/**
 * The Telegram link for personal spending.
 *
 * The webhook is a public URL — the one part of MFC that no session guards —
 * so it is defended three ways, each of which alone would be too little:
 *
 *  1. Telegram signs every delivery with a secret token we mint and register
 *     with `setWebhook`; a request without it is not from Telegram.
 *  2. Only ONE chat may write, and it is claimed by pairing rather than
 *     configured — the owner sends a one-time code from their phone, and that
 *     chat id is stored. Nothing else is ever answered.
 *  3. The chat must be private. A group chat is a room full of people, and
 *     personal spending is not a thing a room should be able to file.
 *
 * The bot token itself stays in the environment, alongside the one the site
 * already uses for inquiry alerts.
 */
import { randomBytes } from 'crypto'
import { readStore, updateStore } from '../../store'

const STORE_KEY = 'mfc_telegram'

/** How long a pairing code is worth typing. */
const LINK_TTL_MS = 15 * 60 * 1000

/** Update ids remembered, so a Telegram retry cannot post an expense twice. */
const SEEN_LIMIT = 60

export interface MfcTelegramConfig {
  /** The single private chat allowed to file expenses. */
  chatId?: number
  /** Registered with Telegram and checked on every delivery. */
  secret?: string
  /**
   * Whose calendar "today" means. The server is UTC and the owner is not —
   * the same mismatch that once emptied the dashboard at midnight.
   */
  timeZone: string
  /** Outstanding pairing code and when it stops being accepted. */
  linkCode?: string
  linkExpiresAt?: string
  linkedAt?: string
  /** Last update handled, newest first — the replay guard. */
  seen: number[]
  lastMessageAt?: string
}

const DEFAULTS: MfcTelegramConfig = { timeZone: 'Asia/Tashkent', seen: [] }

export async function getTgConfig(): Promise<MfcTelegramConfig> {
  const stored = await readStore<Partial<MfcTelegramConfig>>(STORE_KEY, {})
  return { ...DEFAULTS, ...stored, seen: stored.seen ?? [] }
}

export async function patchTgConfig(
  patch: Partial<MfcTelegramConfig>,
): Promise<MfcTelegramConfig> {
  let next: MfcTelegramConfig = DEFAULTS
  await updateStore<Partial<MfcTelegramConfig>>(STORE_KEY, {}, (cur) => {
    next = { ...DEFAULTS, ...cur, ...patch, seen: patch.seen ?? cur.seen ?? [] }
    return next
  })
  return next
}

export function botToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null
}

/** Unambiguous characters only — this gets read off a screen and typed. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function mintLinkCode(): string {
  const bytes = randomBytes(6)
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

/** 32 hex characters — Telegram allows up to 256 of a restricted set. */
export function mintSecret(): string {
  return randomBytes(16).toString('hex')
}

export function linkCodeValid(cfg: MfcTelegramConfig, code: string): boolean {
  if (!cfg.linkCode || !cfg.linkExpiresAt) return false
  if (Date.now() > Date.parse(cfg.linkExpiresAt)) return false
  // Case-insensitive: the code is typed by hand on a phone keyboard.
  return cfg.linkCode.toUpperCase() === code.trim().toUpperCase()
}

export function linkExpiry(now: Date = new Date()): string {
  return new Date(now.getTime() + LINK_TTL_MS).toISOString()
}

/**
 * Record an update id, reporting whether it had already been handled.
 *
 * Telegram redelivers anything it did not get a 200 for, and a slow write on
 * the first attempt would otherwise file the same expense twice.
 */
export async function markSeen(updateId: number): Promise<boolean> {
  let already = false
  await updateStore<Partial<MfcTelegramConfig>>(STORE_KEY, {}, (cur) => {
    const seen = cur.seen ?? []
    if (seen.includes(updateId)) { already = true; return cur }
    return { ...cur, seen: [updateId, ...seen].slice(0, SEEN_LIMIT) }
  })
  return already
}

/** Today's calendar date where the owner is, not where the server is. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  try {
    // en-CA renders as YYYY-MM-DD, which is the shape the ledger stores.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now)
  } catch {
    // An unknown zone must not stop an expense being recorded.
    return now.toISOString().slice(0, 10)
  }
}
