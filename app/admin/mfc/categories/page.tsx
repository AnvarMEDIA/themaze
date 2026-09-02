'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatMoney } from '@/lib/finance/money'
import type { Currency } from '@/lib/finance/types'
import type { MfcCategory, MfcExpense } from '@/lib/mfc/types'
import { chipColor } from '@/lib/mfc/palette'
import { useFinanceLang } from '@/components/admin/finance/lang'
import { CategoryForm } from '@/components/admin/finance/mfc/CategoryForm'
import { catLabel, unlockHref } from '@/components/admin/finance/mfc/shared'

export default function MfcCategoriesPage() {
  const router = useRouter()
  const { t, lang, locale } = useFinanceLang()
  const [cats, setCats] = useState<MfcCategory[]>([])
  const [expenses, setExpenses] = useState<MfcExpense[]>([])
  const [base, setBase] = useState<Currency>('UZS')
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState<MfcCategory | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/finance/mfc/ledger', { cache: 'no-store' })
    if (res.status === 401) { router.push(unlockHref()); return }
    const data = await res.json()
    setCats(data.categories)
    setExpenses(data.expenses)
    setBase(data.baseCurrency)
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  /** How much each category has actually been used — the reason to keep it. */
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of expenses) {
      if (!e.categoryId) continue
      m.set(e.categoryId, (m.get(e.categoryId) ?? 0) + 1)
    }
    return m
  }, [expenses])

  const visible = showArchived ? cats : cats.filter((c) => !c.archived)

  /**
   * Move one step up or down. Arrows rather than drag-and-drop: this list is
   * reordered rarely and read on a phone, where a drag competes with the
   * page's own scroll.
   */
  const move = async (id: string, dir: -1 | 1) => {
    const ordered = [...cats].sort((a, b) => a.order - b.order)
    const i = ordered.findIndex((c) => c.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= ordered.length) return
    ;[ordered[i], ordered[j]] = [ordered[j], ordered[i]]
    setCats(ordered.map((c, k) => ({ ...c, order: k })))     // optimistic
    setSaving(true)
    const res = await fetch('/api/finance/mfc/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ordered.map((c) => c.id) }),
    })
    setSaving(false)
    if (res.ok) setCats(await res.json())
    else { toast.error(t('toast.saveFail')); load() }
  }

  const toggleArchive = async (c: MfcCategory) => {
    const res = await fetch(`/api/finance/mfc/categories/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: !c.archived }),
    })
    if (res.ok) { toast.success(t('mfc.saved')); load() }
    else toast.error(t('toast.saveFail'))
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 py-6 max-w-[840px] mx-auto">
        <div className="h-8 w-40 bg-[#141414] rounded animate-pulse mb-6" />
        <div className="h-96 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 py-6 pb-16 max-w-[840px] mx-auto">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{t('mfc.tabCats')}</h1>
          <p className="text-sm text-[#555] mt-1">{t('mfc.orderHint')}</p>
        </div>
        <button
          type="button"
          onClick={() => { setEditing(null); setOpen(true) }}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-[13px] font-bold transition-colors duration-150 hover:bg-[#D6FF6E] active:scale-[0.97]"
        >
          + {t('mfc.newCategory')}
        </button>
      </div>

      <label className="inline-flex items-center gap-2 my-4 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
          className="w-4 h-4 accent-[#C8FF47] cursor-pointer"
        />
        <span className="text-[12px] text-[#888]">{t('mfc.showArchived')}</span>
      </label>

      <ul className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] overflow-hidden">
        {visible.map((c, i) => (
          <li
            key={c.id}
            className={`flex items-center gap-3 px-3 sm:px-4 py-3 border-b border-[#141414] last:border-b-0 transition-colors ${
              c.archived ? 'opacity-50' : 'hover:bg-[#111]'
            }`}
          >
            <div className="flex flex-col gap-0.5 shrink-0">
              <ArrowBtn dir="up"   label={t('mfc.moveUp')}   onClick={() => move(c.id, -1)} disabled={saving || i === 0} />
              <ArrowBtn dir="down" label={t('mfc.moveDown')} onClick={() => move(c.id, 1)}  disabled={saving || i === visible.length - 1} />
            </div>

            <span
              className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-[18px] leading-none"
              style={{ background: `${chipColor(c.colorSlot)}26` }}
              aria-hidden="true"
            >
              {c.icon}
            </span>

            <button
              type="button"
              onClick={() => { setEditing(c); setOpen(true) }}
              className="min-w-0 flex-1 text-left"
            >
              <p className="text-[13px] text-white truncate">
                {catLabel(c, lang, c.name)}
                {c.archived && <span className="ml-2 text-[10px] text-[#777]">· {t('mfc.archived')}</span>}
              </p>
              <p className="text-[11px] text-[#666] truncate">
                {t('mfc.catCount', { n: counts.get(c.id) ?? 0 })}
                {c.monthlyLimit > 0 && ` · ${formatMoney(c.monthlyLimit, base, { locale })}/${t('mfc.perMonthShort')}`}
              </p>
            </button>

            <button
              type="button"
              onClick={() => toggleArchive(c)}
              title={c.archived ? t('mfc.unarchive') : t('mfc.archiveHint')}
              className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[#777] hover:text-white hover:bg-[#1A1A1A] transition-colors active:scale-[0.97]"
            >
              {c.archived ? t('mfc.unarchive') : t('mfc.archive')}
            </button>
          </li>
        ))}
      </ul>

      <CategoryForm
        open={open}
        onClose={() => { setOpen(false); setEditing(null) }}
        editing={editing}
        baseCurrency={base}
        onSaved={load}
      />
    </div>
  )
}

function ArrowBtn({
  dir, label, onClick, disabled,
}: {
  dir: 'up' | 'down'
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-6 h-5 flex items-center justify-center rounded text-[#666] hover:text-[#C8FF47] hover:bg-[#1A1A1A] transition-colors active:scale-90 disabled:opacity-25 disabled:pointer-events-none"
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path
          d={dir === 'up' ? 'M2.5 7.5L6 4l3.5 3.5' : 'M2.5 4.5L6 8l3.5-3.5'}
          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
