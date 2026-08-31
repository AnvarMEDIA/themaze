'use client'

import { useState } from 'react'
import { formatMoney } from '@/lib/finance/money'
import { MFC_RAMP, MFC_TRACK, chipColor, rampStep } from '@/lib/mfc/palette'
import type { Currency } from '@/lib/finance/types'
import type { MfcCategoryTotal } from '@/lib/mfc/types'
import { useFinanceLang } from '../lang'
import { catLabel } from './shared'

/**
 * Where the money went — the answer this whole tab exists to give.
 *
 * A ranked bar list, not a pie. Spending splits across ~18 categories, and on
 * this surface no set of five or more hues clears the colour-blindness floors
 * when slices can land in any order (see lib/mfc/palette.ts for the measured
 * numbers). So magnitude is carried by bar length in ONE hue — which stays
 * readable at any number of categories — and identity by the name printed on
 * every row. The little coloured disc is the category's own mark, the way a
 * folder has a colour; nothing is encoded by it.
 *
 * The stacked strip above the list gives the part-to-whole read that a pie is
 * usually reached for. Its segments are shaded by RANK from the same single-hue
 * ramp — colour there means "bigger", not "which" — with a 2px surface gap
 * between them and the list underneath naming every one.
 */
export function CategoryBars({
  categories,
  total,
  currency,
}: {
  categories: MfcCategoryTotal[]
  total: number
  currency: Currency
}) {
  const { t, lang, locale } = useFinanceLang()
  const [focus, setFocus] = useState<string | null>(null)

  if (categories.length === 0) return null

  const money = (v: number) => formatMoney(v, currency, { locale })
  const compact = (v: number) => formatMoney(v, currency, { compact: true, locale })
  const pct = (v: number) => `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`
  const max = categories[0]?.total || 1
  const key = (c: MfcCategoryTotal) => c.categoryId ?? '__none__'

  // How much of everything the leading few account for — the sentence a
  // person actually wants out of this panel.
  const leadCount = Math.min(3, categories.length)
  const leadShare = categories.slice(0, leadCount).reduce((s, c) => s + c.share, 0)

  // The strip shows what fits legibly; the rest is one honest remainder rather
  // than a row of slivers.
  const stripMax = MFC_RAMP.length
  const strip = categories.slice(0, stripMax)
  const restTotal = categories.slice(stripMax).reduce((s, c) => s + c.total, 0)

  return (
    <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <h2 className="text-sm font-semibold text-white">{t('mfc.whereItGoes')}</h2>
          <span className="text-[11px] text-[#5A5A5A] tabular-nums">{categories.length}</span>
        </div>
        <p className="text-[11px] text-[#5A5A5A] leading-snug">{t('mfc.whereItGoesHint')}</p>

        {/* Composition strip */}
        <div className="mt-4 flex gap-[2px] h-3 rounded-full overflow-hidden" role="img"
             aria-label={t('mfc.topShare', { n: leadCount, pct: pct(leadShare) })}>
          {strip.map((c, i) => (
            <div
              key={key(c)}
              className="h-full transition-opacity duration-150"
              style={{
                width: `${Math.max(c.share * 100, 0.6)}%`,
                background: rampStep(i),
                opacity: focus && focus !== key(c) ? 0.28 : 1,
              }}
              onMouseEnter={() => setFocus(key(c))}
              onMouseLeave={() => setFocus(null)}
              title={`${catLabel(c, lang, t('mfc.uncategorised'))} · ${money(c.total)} · ${pct(c.share)}`}
            />
          ))}
          {restTotal > 0 && (
            <div
              className="h-full"
              style={{ width: `${(restTotal / (total || 1)) * 100}%`, background: MFC_TRACK }}
              title={`${t('mfc.uncategorised')} · ${money(restTotal)}`}
            />
          )}
        </div>
        {leadCount > 1 && (
          <p className="text-[11px] text-[#777] mt-2.5">
            {t('mfc.topShare', { n: leadCount, pct: pct(leadShare) })}
          </p>
        )}
      </div>

      {/* Ranked list */}
      <ul className="border-t border-[#1A1A1A]">
        {categories.map((c, i) => {
          const id = key(c)
          const dim = focus !== null && focus !== id
          return (
            <li
              key={id}
              onMouseEnter={() => setFocus(id)}
              onMouseLeave={() => setFocus(null)}
              className={`px-5 py-3 border-b border-[#141414] last:border-b-0 transition-colors duration-150 ${
                dim ? 'opacity-45' : 'hover:bg-[#111]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[15px] leading-none"
                  style={{ background: c.categoryId ? `${chipColor(c.colorSlot)}26` : '#1A1A1A' }}
                  aria-hidden="true"
                >
                  {c.icon || '·'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[13px] text-white truncate">
                      {catLabel(c, lang, t('mfc.uncategorised'))}
                    </p>
                    <p className="text-[13px] text-white tabular-nums font-medium shrink-0">
                      {money(c.total)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 mt-1.5">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: MFC_TRACK }}>
                      <div
                        className="h-full rounded-full transition-[width] duration-300 ease-out"
                        style={{ width: `${Math.max((c.total / max) * 100, 1.5)}%`, background: rampStep(i) }}
                      />
                    </div>
                    <span className="text-[11px] text-[#6A6A6A] tabular-nums shrink-0 w-20 text-right">
                      {pct(c.share)} · {t('mfc.times', { n: c.count })}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="px-5 py-3 border-t border-[#232323] bg-[#0B0B0B] flex items-baseline justify-between">
        <span className="text-[12px] text-[#888]">{t('mfc.total')}</span>
        <span className="text-[13px] font-semibold text-white tabular-nums">{compact(total)}</span>
      </div>
    </div>
  )
}
