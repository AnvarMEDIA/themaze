/**
 * MFC colour system — computed against the admin's own surface (#0D0D0D),
 * not chosen by eye.
 *
 * Two palettes doing two different jobs:
 *
 *  · MFC_RAMP is a SEQUENTIAL ramp. It colours the composition bar and the
 *    ranked category bars, where colour encodes magnitude (biggest slice is
 *    brightest) and identity comes from the label beside it. Validated as an
 *    ordinal ramp: monotone lightness, visible steps, the darkest step still
 *    at 3.18:1 against the surface.
 *
 *  · MFC_CHIP_SLOTS is a CATEGORICAL set used only for the little coloured
 *    disc behind a category's emoji. That is UI identity — the way a folder
 *    has a colour — never a data encoding, so two categories sharing a hue
 *    costs nothing.
 *
 * There is deliberately NO pie or donut here, though every expense app has
 * one. Spending splits across ~18 categories, and the palette validator is
 * unambiguous about what that costs: on this surface no set of five or more
 * hues clears the colour-blindness floors when slices can land in any order
 * (the best six-hue subset measures ΔE 2.7 against a floor of 8; the best
 * four, ΔE 6.9). A ring of near-identical wedges is a picture of a chart, not
 * a reading of one. A ranked bar list says the same thing, in one hue, with
 * every row named and priced — and it still works at twenty categories.
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

/** Everything past the ramp's length shares its last step. */
export function rampStep(rank: number): string {
  return MFC_RAMP[Math.min(Math.max(rank, 0), MFC_RAMP.length - 1)]
}

/**
 * Identity discs. The reference categorical order, stepped for a dark
 * surface; verified on #0D0D0D (adjacent pairs: all six checks pass).
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

/** Neutral track behind a bar or meter. */
export const MFC_TRACK = '#1E1E1E'

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
