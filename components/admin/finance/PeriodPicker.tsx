'use client'

import { useEffect, useRef, useState } from 'react'
import { PERIOD_PRESETS, type PeriodPreset } from '@/lib/finance/period'
import { useFinanceLang } from './lang'

export interface PeriodValue {
  preset: PeriodPreset
  from: string
  to: string
}

const LABEL_KEY: Record<PeriodPreset, string> = {
  month: 'dash.periodMonth',
  lastMonth: 'dash.periodLastMonth',
  quarter: 'dash.periodQuarter',
  year: 'dash.periodYear',
  last12: 'dash.period12',
  all: 'dash.periodAll',
  custom: 'dash.periodCustom',
}

/** Turn a period into the query string the finance APIs expect. */
export function periodQuery(p: PeriodValue): string {
  if (p.preset === 'custom') {
    const q = new URLSearchParams()
    if (p.from) q.set('from', p.from)
    if (p.to) q.set('to', p.to)
    return q.toString()
  }
  return `preset=${p.preset}`
}

/**
 * Reporting-period selector. Presets cover the everyday cases; a custom range
 * is there for the ones they don't (a client's financial year, a single
 * campaign). The choice is remembered so the dashboard opens where the studio
 * left it.
 */
export function PeriodPicker({
  value, onChange,
}: {
  value: PeriodValue
  onChange: (v: PeriodValue) => void
}) {
  const { t } = useFinanceLang()
  const [openCustom, setOpenCustom] = useState(value.preset === 'custom')
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    if (value.preset !== 'custom') setOpenCustom(false)
  }, [value.preset])

  const presets = PERIOD_PRESETS.filter((p) => p !== 'custom')

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Wraps rather than scrolls: on a phone the last presets ("All time",
          "Custom") fall off the end of a scroll container with nothing to
          hint they are there. On desktop all six still fit on one line. */}
      <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-[#232323] bg-[#0D0D0D] p-0.5">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange({ preset: p, from: '', to: '' })}
            aria-pressed={value.preset === p}
            className={`px-2.5 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors ${
              value.preset === p
                ? 'bg-[#C8FF47]/12 text-[#C8FF47]'
                : 'text-[#888] hover:text-white'
            }`}
          >
            {t(LABEL_KEY[p])}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpenCustom((v) => !v)}
          aria-pressed={value.preset === 'custom'}
          className={`px-2.5 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors ${
            value.preset === 'custom'
              ? 'bg-[#C8FF47]/12 text-[#C8FF47]'
              : 'text-[#888] hover:text-white'
          }`}
        >
          {t('dash.periodCustom')}
        </button>
      </div>

      {openCustom && (
        <div className="flex items-center gap-1.5 fin-fade">
          <input
            type="date"
            value={value.from}
            max={value.to || undefined}
            onChange={(e) => onChange({ preset: 'custom', from: e.target.value, to: value.to })}
            aria-label={t('dash.periodFrom')}
            className="bg-[#111] border border-[#252525] rounded-lg px-2.5 py-1.5 text-[12px] text-[#EDEBE3] focus:outline-none focus:border-[#C8FF47] transition-colors"
          />
          <span className="text-[#555] text-xs">–</span>
          <input
            type="date"
            value={value.to}
            min={value.from || undefined}
            onChange={(e) => onChange({ preset: 'custom', from: value.from, to: e.target.value })}
            aria-label={t('dash.periodTo')}
            className="bg-[#111] border border-[#252525] rounded-lg px-2.5 py-1.5 text-[12px] text-[#EDEBE3] focus:outline-none focus:border-[#C8FF47] transition-colors"
          />
        </div>
      )}
    </div>
  )
}
