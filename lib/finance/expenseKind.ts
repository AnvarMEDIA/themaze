/**
 * Expense taxonomy: the kind of spending, and who received it.
 *
 * The ledger grew up with one free-text `category` doing three jobs at once —
 * the kind of spend ("Интернет"), the counterparty ("Islom") and the note.
 * That is why nothing could be totalled: "сколько получил Ислом" and "сколько
 * уходит на подписки" are both questions about the same field.
 *
 * The split is `expenseKind` (closed enum, groups reports) + `payee` (who got
 * the money) + `category` (unchanged free text, still the human label). Older
 * rows keep working: an unset kind is its own bucket, never a guess.
 *
 * Pure and client-safe.
 */
import { EXPENSE_KINDS, type ExpenseKind, type FinanceTransaction } from './types'

/**
 * Grouping key for a payee. Names get typed slightly differently every time —
 * "Islom", " islom", "Islom " — and three spellings of one person would split
 * their pay across three rows of a report. Case, spacing and the Russian
 * ё/е split are folded; nothing else is guessed at.
 */
export function payeeKey(name: string | undefined | null): string {
  return (name ?? '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
}

/* ── Keyword rules ───────────────────────────────────────────────────────
 * Matched against the category, note and payee together, in Russian, English
 * and Uzbek, because all three get typed in practice. Order matters: the
 * first kind whose words appear wins, so the specific rules come first.
 */
const RULES: { kind: ExpenseKind; words: string[] }[] = [
  { kind: 'payroll', words: [
    'зарплат', 'зп', 'получк', 'аванс', 'оклад', 'премия', 'гонорар',
    'salary', 'payroll', 'wage', 'advance', 'bonus',
    'maosh', 'oylik', 'ish haqi', 'avans',
  ] },
  { kind: 'contractor', words: [
    'подрядчик', 'фриланс', 'аутсорс', 'субподряд', 'исполнител',
    'freelance', 'contractor', 'outsourc', 'subcontract',
  ] },
  { kind: 'rent', words: ['аренд', 'ренда', 'rent', 'lease', 'ijara', 'ijaraga'] },
  { kind: 'utilities', words: [
    'интернет', 'вода', 'свет', 'электр', 'коммунал', 'связь', 'газ', 'отоплен',
    'internet', 'water', 'electric', 'utilit', 'heating', 'phone bill',
    'suv', 'kommunal', 'chiroq', 'gaz',
  ] },
  { kind: 'subscriptions', words: [
    'подписк', 'хостинг', 'домен', 'лиценз', 'облак',
    'subscription', 'hosting', 'domain', 'licence', 'license', 'saas', 'cloud',
    'figma', 'adobe', 'notion', 'slack', 'dropbox', 'canva', 'framer', 'vercel',
    'github', 'openai', 'chatgpt', 'claude', 'google workspace', 'microsoft 365',
    'spotify', 'zoom', 'linear', 'webflow', 'envato', 'shutterstock', 'freepik',
  ] },
  { kind: 'equipment', words: [
    'техник', 'оборудован', 'ноутбук', 'монитор', 'мебель', 'принтер', 'компьютер',
    'equipment', 'hardware', 'laptop', 'macbook', 'monitor', 'furniture', 'printer',
    'texnika', 'jihoz',
  ] },
  { kind: 'marketing', words: [
    'реклам', 'маркетинг', 'таргет', 'продвижен', 'smm', 'блогер',
    'marketing', 'advertis', 'ads', 'promo', 'campaign',
    'reklama',
  ] },
  { kind: 'taxes', words: [
    'налог', 'ндс', 'пошлин', 'пенсионн', 'страхов', 'штраф',
    'tax', 'vat', 'duty', 'fine', 'insurance',
    'soliq',
  ] },
  { kind: 'travel', words: [
    'такси', 'командировк', 'билет', 'бензин', 'топлив', 'транспорт', 'парковк',
    'taxi', 'travel', 'flight', 'ticket', 'fuel', 'petrol', 'transport', 'parking',
    'taksi', 'benzin',
  ] },
  { kind: 'office', words: [
    'канцеляр', 'хозтовар', 'уборк', 'клининг', 'кофе', 'чай', 'продукт', 'обед',
    'office', 'stationery', 'cleaning', 'coffee', 'snack', 'lunch', 'supplies',
    'ofis', 'tozalash',
  ] },
]

/** Looks like a person's name rather than a thing: 1–3 plain words, no digits. */
export function looksLikeName(text: string): boolean {
  const s = text.trim()
  if (!s || s.length > 40) return false
  if (/\d/.test(s)) return false
  const words = s.split(/\s+/)
  if (words.length > 3) return false
  // Letters, hyphens and apostrophes only — Cyrillic or Latin, incl. Uzbek ʻ.
  return words.every((w) => /^[\p{L}][\p{L}'’ʻ-]*$/u.test(w))
}

export interface KindSuggestion {
  kind: ExpenseKind
  /** Only set when the suggestion is that this is pay to a named person. */
  payee: string
  /** Why it was suggested, so a bulk apply can be reviewed rather than trusted. */
  reason: 'keyword' | 'known-payee' | 'name-like' | 'none'
}

/**
 * Suggest a kind (and payee) for a row that has none.
 *
 * A SUGGESTION — never applied on its own. Money records are not the place for
 * a computer's guess to become a fact without someone agreeing to it.
 *
 * `knownPayees` are normalised names already seen on classified rows; matching
 * one is stronger evidence than the shape of the text, so it is checked first.
 */
export function suggestKind(
  tx: Pick<FinanceTransaction, 'category' | 'note' | 'payee'>,
  knownPayees: Set<string> = new Set(),
): KindSuggestion {
  const category = (tx.category ?? '').trim()
  const payee = (tx.payee ?? '').trim()
  const haystack = `${category} ${tx.note ?? ''} ${payee}`.toLowerCase()

  // A name already known to be paid — the strongest signal available.
  for (const candidate of [payee, category]) {
    if (candidate && knownPayees.has(payeeKey(candidate))) {
      return { kind: 'payroll', payee: candidate, reason: 'known-payee' }
    }
  }

  for (const rule of RULES) {
    if (rule.words.some((w) => haystack.includes(w))) {
      // A payroll keyword often sits next to the name ("Аванс Ислом").
      return {
        kind: rule.kind,
        payee: rule.kind === 'payroll' ? payee : payee || (rule.kind === 'subscriptions' || rule.kind === 'rent' ? category : ''),
        reason: 'keyword',
      }
    }
  }

  // A bare name in the category field is how payroll has been recorded so far.
  if (looksLikeName(category)) {
    return { kind: 'payroll', payee: category, reason: 'name-like' }
  }

  return { kind: 'other', payee: payee, reason: 'none' }
}

/** Names already recorded as payees, for `suggestKind` to lean on. */
export function knownPayees(txns: FinanceTransaction[]): Set<string> {
  const out = new Set<string>()
  for (const t of txns) {
    if (t.type !== 'expense') continue
    if (t.expenseKind === 'payroll' && t.payee?.trim()) out.add(payeeKey(t.payee))
  }
  return out
}

/** Expenses that have never been classified. */
export function unclassified(txns: FinanceTransaction[]): FinanceTransaction[] {
  return txns.filter((t) => t.type === 'expense' && !t.expenseKind)
}

export function isExpenseKind(v: unknown): v is ExpenseKind {
  return typeof v === 'string' && (EXPENSE_KINDS as readonly string[]).includes(v)
}
