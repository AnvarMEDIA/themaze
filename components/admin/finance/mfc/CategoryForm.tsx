'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { formatMoney } from '@/lib/finance/money'
import { ICON_CHOICES } from '@/lib/mfc/defaults'
import { HEX_RE, MFC_CHIP_SLOTS, categoryColor, contrastOnSurface, expandHex } from '@/lib/mfc/palette'
import type { Currency } from '@/lib/finance/types'
import type { MfcCategory } from '@/lib/mfc/types'
import { Modal } from '../Modal'
import { Field, FormActions, Text, Area, NumberField } from '../fields'
import { useFinanceLang } from '../lang'

/**
 * Add or edit a category.
 *
 * Deleting is deliberately the harder path: archiving keeps a category's past
 * expenses grouped under a name, while deleting strips the label off spending
 * that still happened. The confirm text says which is which rather than asking
 * "are you sure?" about something the person can't see the consequence of.
 */
export function CategoryForm({
  open,
  onClose,
  editing,
  baseCurrency,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  editing: MfcCategory | null
  baseCurrency: Currency
  onSaved: () => void
}) {
  const { t, locale } = useFinanceLang()
  const [name, setName] = useState('')
  const [nameRu, setNameRu] = useState('')
  const [icon, setIcon] = useState<string>(ICON_CHOICES[0])
  const [keywords, setKeywords] = useState('')
  const [colorSlot, setColorSlot] = useState(0)
  // '' means "use the slot". Kept separate from the slot rather than replacing
  // it, so clearing a custom colour falls back to the choice underneath it.
  const [color, setColor] = useState('')
  const [limit, setLimit] = useState('0')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setNameRu(editing?.nameRu ?? '')
    setIcon(editing?.icon || ICON_CHOICES[0])
    setKeywords(editing?.keywords ?? '')
    setColorSlot(editing?.colorSlot ?? 0)
    setColor(editing?.color ?? '')
    setLimit(String(editing?.monthlyLimit ?? 0))
  }, [open, editing])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      const body = JSON.stringify({
        name: name.trim(),
        nameRu: nameRu.trim(),
        icon,
        keywords: keywords.trim(),
        colorSlot,
        // Half-typed hex ("#3b") is dropped rather than rejected: the picker
        // beside it already shows what will be saved.
        color: HEX_RE.test(color.trim()) ? expandHex(color.trim()) : '',
        monthlyLimit: Number(limit) || 0,
      })
      const res = await fetch(
        editing ? `/api/finance/mfc/categories/${editing.id}` : '/api/finance/mfc/categories',
        { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body },
      )
      if (!res.ok) throw new Error('save failed')
      toast.success(t('mfc.saved'))
      onSaved()
      onClose()
    } catch {
      toast.error(t('toast.saveFail'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!editing) return
    if (!window.confirm(t('mfc.deleteCatConfirm'))) return
    setBusy(true)
    try {
      const res = await fetch(`/api/finance/mfc/categories/${editing.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
      toast.success(t('toast.deleted'))
      onSaved()
      onClose()
    } catch {
      toast.error(t('toast.deleteFail'))
    } finally {
      setBusy(false)
    }
  }

  const limitNum = Number(limit) || 0
  // What the category will actually be drawn in — the same resolver the
  // dashboard uses, so the preview above cannot drift from the real thing.
  const swatch = categoryColor({ colorSlot, color })
  const custom = HEX_RE.test(color.trim())
  // A mark needs 3:1 against the panel to be seen at all. A colour input will
  // hand back near-black without blinking, and a bar nobody can see is worth a
  // word — a warning, not a veto.
  const faint = custom && contrastOnSurface(color.trim()) < 3

  return (
    <Modal open={open} onClose={onClose} title={editing ? t('mfc.editCategory') : t('mfc.newCategory')}>
      <form onSubmit={submit} className="space-y-4">
        {/* Live preview — the chip exactly as it will appear in the grid */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#111] border border-[#1E1E1E]">
          <span
            className="w-11 h-11 rounded-full flex items-center justify-center text-[20px] leading-none"
            style={{ background: `${swatch}26` }}
            aria-hidden="true"
          >
            {icon}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-white truncate">{name || t('mfc.name')}</p>
            <p className="text-[11px] text-[#666] truncate">
              {limitNum > 0 ? formatMoney(limitNum, baseCurrency, { locale }) : t('mfc.noBudgets')}
            </p>
          </div>
        </div>

        <Field label={t('mfc.name')}>
          <Text value={name} onChange={setName} required maxLength={60} />
        </Field>

        <Field label={t('mfc.nameRu')} hint={t('mfc.nameRuHint')}>
          <Text value={nameRu} onChange={setNameRu} maxLength={60} />
        </Field>

        <Field label={t('mfc.icon')}>
          <div className="grid grid-cols-8 sm:grid-cols-11 gap-1 max-h-36 overflow-y-auto p-1 rounded-lg bg-[#111] border border-[#252525]">
            {ICON_CHOICES.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setIcon(e)}
                aria-pressed={icon === e}
                aria-label={e}
                className={`aspect-square rounded-md text-[16px] leading-none flex items-center justify-center transition-colors duration-100 active:scale-[0.94] ${
                  icon === e ? 'bg-[#C8FF47]/15 ring-1 ring-[#C8FF47]/50' : 'hover:bg-[#1B1B1B]'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t('mfc.color')}>
          <div className="flex flex-wrap items-center gap-1.5">
            {MFC_CHIP_SLOTS.map((hex, i) => (
              <button
                key={hex}
                type="button"
                // Picking a preset drops the custom colour: two selections
                // showing at once would leave which one wins to guesswork.
                onClick={() => { setColorSlot(i); setColor('') }}
                aria-pressed={!custom && colorSlot === i}
                aria-label={`${t('mfc.color')} ${i + 1}`}
                className={`w-8 h-8 rounded-full transition-transform duration-100 active:scale-[0.92] ${
                  !custom && colorSlot === i ? 'ring-2 ring-offset-2 ring-offset-[#0D0D0D] ring-white/70' : ''
                }`}
                style={{ background: hex }}
              />
            ))}

            <span className="w-px h-6 bg-[#252525] mx-0.5" aria-hidden="true" />

            {/* Any colour at all. The native input is the picker every OS
                already has — no dependency, and it opens the eyedropper the
                person's browser ships with. */}
            <label
              className={`relative w-8 h-8 rounded-full cursor-pointer transition-transform duration-100 active:scale-[0.92] ${
                custom ? 'ring-2 ring-offset-2 ring-offset-[#0D0D0D] ring-white/70' : ''
              }`}
              style={{
                background: custom
                  ? swatch
                  : 'conic-gradient(#e66767,#c98500,#8FC748,#199e70,#3987e5,#9085e9,#d55181,#e66767)',
              }}
              title={t('mfc.colorCustom')}
            >
              <input
                type="color"
                value={custom ? swatch : '#3987e5'}
                onChange={(e) => setColor(e.target.value)}
                aria-label={t('mfc.colorCustom')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </label>

            {/* Typed, for a colour that comes from somewhere else — a brand
                sheet, another app, a screenshot someone sampled. */}
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              onBlur={() => setColor((v) => (HEX_RE.test(v.trim()) ? expandHex(v.trim()) : ''))}
              placeholder="#RRGGBB"
              maxLength={7}
              spellCheck={false}
              aria-label={t('mfc.colorCustom')}
              className="w-[104px] bg-[#111] border border-[#252525] rounded-lg px-2.5 py-1.5 text-[12px] font-mono text-[#EDEBE3] placeholder:text-[#4A4A4A] focus:outline-none focus:border-[#C8FF47] transition-colors"
            />

            {custom && (
              <button
                type="button"
                onClick={() => setColor('')}
                className="text-[12px] text-[#777] hover:text-white px-1.5 py-1 rounded transition-colors active:scale-[0.97]"
              >
                {t('mfc.colorReset')}
              </button>
            )}
          </div>
          {faint && (
            <p className="text-[11px] text-[#FFD447] mt-2">{t('mfc.colorFaint')}</p>
          )}
        </Field>

        <Field label={t('mfc.limit')} hint={t('mfc.limitHint', { currency: baseCurrency })}>
          <NumberField value={limit} onChange={setLimit} placeholder="0" />
        </Field>

        <Field label={t('mfc.keywords')} hint={t('mfc.keywordsHint')}>
          <Area value={keywords} onChange={setKeywords} rows={2} placeholder="такси, метро, автобус" />
        </Field>

        <FormActions busy={busy} onCancel={onClose} onDelete={editing ? remove : undefined} />
      </form>
    </Modal>
  )
}
