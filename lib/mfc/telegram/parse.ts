/**
 * Turning "вчера такси 25к" into an expense.
 *
 * The point of recording spending from Telegram is that it takes less effort
 * than opening the app — so the grammar has to accept how a person actually
 * types, not a format they have to remember. Order is free, the category may
 * be written in either language, the amount may carry a suffix or a currency
 * sign, and anything left over becomes the note.
 *
 * Pure and client-safe: no store, no clock of its own. `today` is passed in,
 * because the server runs in UTC and the person typing does not.
 */
import { CURRENCY_META } from '../../finance/money'
import type { Currency } from '../../finance/types'
import type { MfcCategory } from '../types'

export interface ParsedExpense {
  amount: number
  currency: Currency
  date: string
  categoryId: string | null
  /** Which part of the text named the category, for the confirmation. */
  categoryName: string
  note: string
}

export type ParseResult =
  | { ok: true; value: ParsedExpense }
  | { ok: false; reason: 'empty' | 'no-amount' | 'bad-amount' }

/** ё→е and one kind of apostrophe, so "Кафе" matches "кафе" and "so'm" "soʻm". */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[’ʻ`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/* ── currency ───────────────────────────────────────────────────────────── */

/**
 * Anchored on purpose. An unanchored /сум/ swallows "сумка", and /м/ would
 * eat half the language — a currency is only recognised as a whole word, or
 * as a sign stuck to the number.
 */
const CURRENCY_WORDS: Array<[RegExp, Currency]> = [
  // \p{L}, not \w: JavaScript's \w is ASCII-only, so "доллар\w*" never
  // matched "долларов" and the amount was silently read as som.
  [/^(?:\$|usd|доллар\p{L}*|долл\.?|бакс\p{L}*)$/u, 'USD'],
  [/^(?:€|eur|евро)$/u, 'EUR'],
  [/^(?:₽|rub|руб\p{L}*)$/u, 'RUB'],
  [/^(?:сум|сума|сумм?ы|uzs|so'?m)$/u, 'UZS'],
]

/** The same signs, where they can sit against the digits: "20$", "$20". */
const CURRENCY_SIGNS: Array<[RegExp, Currency]> = [
  [/^\$|\$$|^usd$|usd$/u, 'USD'],
  [/^€|€$|eur$/u, 'EUR'],
  [/^₽|₽$|rub$/u, 'RUB'],
  [/сум$|uzs$|so'?m$/u, 'UZS'],
]

/* ── multipliers ────────────────────────────────────────────────────────── */

const MULTIPLIERS: Array<[RegExp, number]> = [
  [/^(?:млн|млн\.|м|m|kk|кк)$/u, 1_000_000],
  [/^(?:тыс|тыс\.|т|к|k)$/u, 1_000],
]

/* ── dates ──────────────────────────────────────────────────────────────── */

const DAY_WORDS: Array<[RegExp, number]> = [
  [/^(?:позавчера|поза)$/u, -2],
  [/^(?:вчера|вчерашн\p{L}*|yesterday|yday)$/u, -1],
  [/^(?:сегодня|today)$/u, 0],
]

const pad = (n: number) => String(n).padStart(2, '0')

/** Shift a calendar string by whole days without ever parsing it as local time. */
export function shiftDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * A written date: 5.09, 05.09.2026, 5/9, 2026-09-05.
 *
 * A bare day and month with no year is read as the most recent one that has
 * already happened — typing "31.12" on 2 January means five weeks ago, not
 * eleven months away.
 */
function parseWrittenDate(token: string, today: string): string | null {
  const iso = token.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return token

  const dm = token.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?$/)
  if (!dm) return null
  const day = Number(dm[1])
  const month = Number(dm[2])
  if (day < 1 || day > 31 || month < 1 || month > 12) return null

  if (dm[3]) {
    const y = Number(dm[3])
    const year = y < 100 ? 2000 + y : y
    return `${year}-${pad(month)}-${pad(day)}`
  }

  const thisYear = Number(today.slice(0, 4))
  const candidate = `${thisYear}-${pad(month)}-${pad(day)}`
  return candidate <= today ? candidate : `${thisYear - 1}-${pad(month)}-${pad(day)}`
}

/* ── amount ─────────────────────────────────────────────────────────────── */

/**
 * Read a number the way it was typed.
 *
 * A separator followed by exactly three digits is a thousands separator when
 * the currency has no minor unit — "25.000" and "25,000" are both 25,000 som,
 * because a fraction of a som does not exist and reading it as 25 would be a
 * thousandfold error on the one currency this is used in most. For a currency
 * with decimals the same text is 25.000 dollars, which it plainly is.
 */
export function readNumber(raw: string, currency: Currency): number | null {
  const cleaned = raw.replace(/\s/g, '')
  if (!/^\d[\d.,]*$/.test(cleaned)) return null

  const groups = cleaned.split(/[.,]/)
  if (groups.length === 1) return Number(groups[0])

  const last = groups[groups.length - 1]
  const head = groups.slice(0, -1).join('')
  const thousandsShaped = last.length === 3 && CURRENCY_META[currency].decimals === 0

  // More than one separator can only be thousands: 1.234.567.
  if (groups.length > 2 || thousandsShaped) {
    return /^\d+$/.test(head + last) ? Number(head + last) : null
  }
  const n = Number(`${head}.${last}`)
  return Number.isFinite(n) ? n : null
}

/* ── categories ─────────────────────────────────────────────────────────── */

interface CategoryMatch {
  id: string
  name: string
  /** Token indices the match consumed. */
  from: number
  to: number
}

/** A word short enough to appear by accident: "и", "вне", "net". */
const TOO_SHORT = 4

/** Split a category's keywords field: commas, semicolons or plain spaces. */
export function keywordList(raw: string | undefined): string[] {
  return norm(raw ?? '').split(/[,;]+|\s+/).map((w) => w.trim()).filter(Boolean)
}

/**
 * Which category the words name.
 *
 * Three ways in, because nobody types the category the way it is titled. The
 * full name ("кафе и еда вне") is the strongest signal; a single distinctive
 * word of it ("жильё" out of "Жильё и аренда") is the next; and the keywords
 * carry what people actually write — "такси", "кофе", "бензин" — which no
 * category is ever going to be called. The emoji works too, since it is one
 * tap away on a phone keyboard.
 *
 * Longest match wins, so a two-word name always beats one of its own words.
 */
function matchCategory(tokens: string[], categories: MfcCategory[]): CategoryMatch | null {
  const candidates: Array<{ id: string; label: string; words: string[] }> = []

  for (const c of categories) {
    if (c.archived) continue
    const labels = [c.name, c.nameRu].filter((s): s is string => Boolean(s?.trim()))
    const display = c.nameRu?.trim() || c.name

    for (const label of labels) {
      const words = norm(label).split(' ').filter(Boolean)
      if (words.length) candidates.push({ id: c.id, label, words })
      // Each distinctive word on its own.
      if (words.length > 1) {
        for (const w of words) {
          if (w.length >= TOO_SHORT) candidates.push({ id: c.id, label, words: [w] })
        }
      }
    }
    for (const kw of keywordList(c.keywords)) {
      candidates.push({ id: c.id, label: display, words: kw.split(' ').filter(Boolean) })
    }
    if (c.icon) candidates.push({ id: c.id, label: display, words: [c.icon] })
  }

  candidates.sort((a, b) => b.words.length - a.words.length || b.words[0].length - a.words[0].length)

  for (const cand of candidates) {
    for (let i = 0; i + cand.words.length <= tokens.length; i++) {
      const slice = tokens.slice(i, i + cand.words.length)
      if (slice.every((w, k) => w === cand.words[k])) {
        return { id: cand.id, name: cand.label, from: i, to: i + cand.words.length - 1 }
      }
    }
  }
  return null
}

/* ── the whole line ─────────────────────────────────────────────────────── */

export function parseExpenseMessage(
  text: string,
  categories: MfcCategory[],
  baseCurrency: Currency,
  today: string,
): ParseResult {
  // `\b` is defined on ASCII word characters, so it never fires after a
  // Cyrillic letter — the boundary has to be spelled out.
  const cleaned = norm(text.replace(/^\/(?:add|расход|трата)(?=\s|$)/iu, ' '))
    // "25 000" is one number written the way money is written. Joined only
    // when the following group is exactly three digits, so "вчера 5 такси"
    // and "25 5" are left alone.
    .replace(/(\d)\s+(?=\d{3}(?:\D|$))/gu, '$1')
  if (!cleaned) return { ok: false, reason: 'empty' }

  const tokens = cleaned.split(' ').filter(Boolean)
  const used = new Set<number>()

  /* currency — a word of its own, or a sign against the digits */
  let currency = baseCurrency
  let foundCurrency = false
  for (let i = 0; i < tokens.length && !foundCurrency; i++) {
    for (const [re, cur] of CURRENCY_WORDS) {
      if (!re.test(tokens[i])) continue
      currency = cur
      used.add(i)
      foundCurrency = true
      break
    }
    if (foundCurrency) break
    // Only where digits are present, so "сумка" stays a word.
    if (!/\d/.test(tokens[i])) continue
    for (const [re, cur] of CURRENCY_SIGNS) {
      if (!re.test(tokens[i])) continue
      currency = cur
      tokens[i] = tokens[i].replace(re, '').trim()
      foundCurrency = true
      break
    }
  }

  /* date — a keyword or a written date */
  let date = today
  for (let i = 0; i < tokens.length; i++) {
    if (used.has(i)) continue
    const word = DAY_WORDS.find(([re]) => re.test(tokens[i]))
    if (word) { date = shiftDays(today, word[1]); used.add(i); break }
    const written = parseWrittenDate(tokens[i], today)
    if (written) { date = written; used.add(i); break }
  }

  /* amount — a number, optionally followed or suffixed by a multiplier */
  let amount: number | null = null
  let sawDigits = false
  for (let i = 0; i < tokens.length; i++) {
    if (used.has(i)) continue
    const m = tokens[i].match(/^(\d[\d\s.,]*?)([а-яa-z.]*)$/u)
    if (!m) continue
    sawDigits = true
    const n = readNumber(m[1], currency)
    if (n === null) continue

    let mult = 1
    if (m[2]) {
      const found = MULTIPLIERS.find(([re]) => re.test(m[2]))
      if (!found) continue          // "20th" is not an amount
      mult = found[1]
    }
    used.add(i)

    // A multiplier can also stand as its own word: "25 к".
    if (mult === 1 && i + 1 < tokens.length && !used.has(i + 1)) {
      const next = MULTIPLIERS.find(([re]) => re.test(tokens[i + 1]))
      if (next) { mult = next[1]; used.add(i + 1) }
    }
    amount = n * mult
    break
  }

  if (amount === null) return { ok: false, reason: sawDigits ? 'bad-amount' : 'no-amount' }
  if (!(amount > 0) || !Number.isFinite(amount)) return { ok: false, reason: 'bad-amount' }

  /* category — from whatever words are left */
  const rest = tokens.map((t, i) => (used.has(i) ? '' : t))
  const cat = matchCategory(rest, categories)
  if (cat) for (let i = cat.from; i <= cat.to; i++) used.add(i)

  const note = tokens.filter((_, i) => !used.has(i)).join(' ').trim()

  return {
    ok: true,
    value: {
      amount,
      currency,
      date,
      categoryId: cat?.id ?? null,
      categoryName: cat?.name ?? '',
      // The note keeps the words as typed, only trimmed — it is the one field
      // a person reads back later.
      note: note.slice(0, 500),
    },
  }
}
