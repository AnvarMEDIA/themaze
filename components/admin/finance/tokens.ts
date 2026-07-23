/**
 * Finance chart tokens. Colors were chosen against the admin's dark surface
 * (#0D0D0D) and VALIDATED with the dataviz palette validator:
 *  - status quartet passes all six checks (lightness band, chroma floor,
 *    CVD separation, normal-vision floor, contrast) on dark.
 *  - income vs expense is NEVER encoded by color alone (green/red is the
 *    worst colorblind pair): the monthly chart is single-series, and the
 *    ledger marks income/expense with an icon + text label, not just hue.
 */
export const FIN_COLORS = {
  // Brand lime — single-series hero fills (revenue, top clients). One series,
  // so no categorical separation concern; the title names it.
  income: '#C8FF47',
  expense: '#D9563A',
  // Validated categorical quartet for project status (each bar also labeled).
  status: {
    lead:      '#3E92C8',
    active:    '#6FA02E',
    completed: '#9166D6',
    cancelled: '#B5852F',
  },
} as const

// Human-readable status/method labels now live in the finance i18n dictionary
// (lib/finance/i18n.ts) and are resolved via useFinanceLang().tStatus / tMethod.
