'use client'

import type { ReactNode } from 'react'
import { useFinanceLang } from './lang'

const inputCls =
  'w-full bg-[#111] border border-[#252525] rounded-lg px-3.5 py-2.5 text-sm text-[#EDEBE3] placeholder:text-[#4A4A4A] focus:outline-none focus:border-[#C8FF47] transition-colors'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#5A5A5A] block mb-1.5">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-[#555] mt-1 block">{hint}</span>}
    </label>
  )
}

export function Text({
  value, onChange, placeholder, required, type = 'text', maxLength,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  type?: string
  maxLength?: number
}) {
  return (
    <input
      type={type}
      value={value}
      required={required}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  )
}

export function Area({
  value, onChange, placeholder, rows = 3,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputCls} resize-none`}
    />
  )
}

export function Select({
  value, onChange, options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#111]">{o.label}</option>
      ))}
    </select>
  )
}

export function NumberField({
  value, onChange, placeholder, step = 'any',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  step?: string
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min="0"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputCls} tabular-nums`}
    />
  )
}

export function FormActions({
  busy, onCancel, submitLabel, onDelete,
}: {
  busy?: boolean
  onCancel: () => void
  submitLabel?: string
  /** When provided, a Delete button appears on the left (used for editing). */
  onDelete?: () => void
}) {
  const { t } = useFinanceLang()
  return (
    <div className="flex items-center gap-2 pt-2">
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="mr-auto px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors active:scale-[0.97]"
        >
          {t('common.delete')}
        </button>
      )}
      <button
        type="button"
        onClick={onCancel}
        className={`${onDelete ? '' : 'ml-auto'} px-4 py-2.5 rounded-lg text-sm text-[#999] hover:text-white hover:bg-[#161616] transition-colors active:scale-[0.97]`}
      >
        {t('common.cancel')}
      </button>
      <button
        type="submit"
        disabled={busy}
        className="px-5 py-2.5 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-sm font-bold hover:bg-[#F0EEE6] transition-colors disabled:opacity-60 active:scale-[0.97]"
      >
        {busy ? t('common.saving') : (submitLabel ?? t('common.save'))}
      </button>
    </div>
  )
}
