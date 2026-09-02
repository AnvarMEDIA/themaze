/**
 * MFC colour system — computed against the admin's own surface (#0D0D0D),
 * not chosen by eye.
 *
 * Two palettes doing two different jobs:
 *
 *  · MFC_CHIP_SLOTS is CATEGORICAL: a colour belongs to a category, the way a
 *    folder has one. It paints the disc behind the category's emoji, its bar
 *    in "where it goes", and its segment of the composition strip — the same
 *    hue in all three, so the eye can join them without being told.
 *
 *  · MFC_RAMP is a SEQUENTIAL ramp, for magnitude over time: the trend chart's
 *    columns. Validated as an ordinal ramp — monotone lightness, visible
 *    steps, the darkest still at 3.18:1 against the surface.
 *
 * What the categorical set is and is not good for, measured rather than
 * argued (dataviz validator, dark, surface #0D0D0D):
 *
 *   adjacent pairs → all six checks PASS
 *   all pairs      → FAIL: #e66767 ↔ #d95926 at ΔE 7.1 for normal vision,
 *                    #d55181 ↔ #199e70 at ΔE 1.6 for deuteranopia
 *
 * Any two of the eight can end up side by side once rows are ranked, so the
 * all-pairs number is the one that governs — and it says colour cannot be
 * asked to carry identity here. It isn't: every bar sits on its own row with
 * the category's emoji, name, amount, share and count beside it, and length
 * carries the magnitude. Colour is reinforcement. Two categories in a similar
 * red cost nothing, because nobody has to tell them apart by hue.
 *
 * That is exactly why there is still NO pie or donut, though every expense app
 * has one. In a ring the wedge IS the label, and those same numbers become the
 * whole reading: the best six-hue subset measures ΔE 2.7 against a floor of 8,
 * the best four 6.9. A ring of near-identical wedges is a picture of a chart,
 * not a reading of one. The ranked list says the same thing, names every row,
 * and still works at twenty categories.
 */

/**
 * Lime → deep olive, 7 steps. Brand accent at the top end.
 * Verified with the dataviz validator:
 *   --ordinal --mode dark --surface #0D0D0D → all checks pass.
 */
export const MFC_RAMP = [
  '#C8FF47',
  '#AEE83A',
  '#93D02E',
  '#79B824',
  '#5FA01B',
  '#468813',
  '#2E700C',
] as const

/**
 * Category colours. The reference categorical order, stepped for a dark
 * surface; verified on #0D0D0D (adjacent pairs: all six checks pass).
 *
 * A slot is stored on the category and never recomputed, so a colour follows
 * the entity rather than its rank — changing the period reorders the list
 * without repainting anything.
 */
export const MFC_CHIP_SLOTS = [
  '#3987e5', // blue
  '#d95926', // orange
  '#199e70', // aqua
  '#c98500', // yellow
  '#d55181', // magenta
  '#008300', // green
  '#9085e9', // violet
  '#e66767', // red
] as const

export function chipColor(slot: number): string {
  const n = MFC_CHIP_SLOTS.length
  // Stored slots are validated on write, but a hand-edited store shouldn't
  // crash a dashboard — wrap rather than return undefined.
  return MFC_CHIP_SLOTS[((slot % n) + n) % n]
}

/** `#rgb` or `#rrggbb`, the two forms a colour input and a person produce. */
export const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

/** `#abc` → `#aabbcc`; anything already long, or invalid, comes back as-is. */
export function expandHex(hex: string): string {
  const h = hex.trim().toLowerCase()
  return h.length === 4 && HEX_RE.test(h) ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h
}

/**
 * The colour a category is drawn in: the one it was given by hand, or its
 * slot.
 *
 * Everything that paints a category goes through here, so a colour picked in
 * the editor turns up on the disc, the bar, the strip and the budget line
 * without any of them knowing the difference.
 */
export function categoryColor(c: { colorSlot: number; color?: string }): string {
  const custom = (c.color ?? '').trim()
  return HEX_RE.test(custom) ? expandHex(custom) : chipColor(c.colorSlot)
}

/** The surface every MFC colour is judged against. */
export const MFC_SURFACE = '#0D0D0D'

/**
 * WCAG contrast of a colour against the panel's surface.
 *
 * Used to warn — never to refuse. A chart mark wants 3:1 to be seen at all,
 * and a colour picker will happily hand back near-black, which paints an
 * invisible bar on a dark panel. Saying so beside the swatch is more useful
 * than silently correcting a choice someone made on purpose.
 */
export function contrastOnSurface(hex: string, surface: string = MFC_SURFACE): number {
  const lum = (h: string): number => {
    const v = expandHex(h).slice(1)
    const ch = [0, 2, 4].map((i) => {
      const c = parseInt(v.slice(i, i + 2), 16) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
  }
  if (!HEX_RE.test(hex.trim())) return 0
  const [hi, lo] = [lum(hex), lum(surface)].sort((a, b) => b - a)
  return (hi + 0.05) / (lo + 0.05)
}

/** Neutral track behind a bar or meter. */
export const MFC_TRACK = '#1E1E1E'

/**
 * Spending with no category yet, and the tail the composition strip folds
 * together. Grey on purpose — it is the absence of a category, not one more
 * of them — and light enough to read as a mark: 3.6:1 on the surface, 3.1:1
 * against the track it sits in.
 */
export const MFC_UNSORTED = '#6A6A6A'

/**
 * Budget states. Status colours, reserved — never reused as series colours,
 * and always shipped with a number beside them so the colour is reinforcement
 * rather than the message.
 */
export const MFC_BUDGET = {
  under: '#C8FF47',
  close: '#fab219',
  over:  '#d03b3b',
} as const

export function budgetTone(ratio: number): keyof typeof MFC_BUDGET {
  if (ratio >= 1) return 'over'
  if (ratio >= 0.8) return 'close'
  return 'under'
}
