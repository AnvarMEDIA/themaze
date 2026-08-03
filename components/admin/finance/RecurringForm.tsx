'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from './Modal'
import { Field, Text, Area, Select, NumberField, FormActions } from './fields'
import {
  CURRENCIES, PAYMENT_METHODS, RECUR_INTERVALS, TRANSACTION_TYPES,
  type FinanceClient, type FinanceProject, type FinanceRecurring,
} from '@/lib/finance/types'
import { useFinanceLang } from './lang'
import { todayLocal } from '@/lib/finance/date'

const today = todayLocal

const blank = () => ({
  title: '', type: 'income', amount: '', currency: 'UZS',
  interval: 'monthly', startDate: today(), endDate: '',
  clientId: '', projectId: '', method: 'bank', category: '', note: '',
  active: true,
})

export function RecurringForm({
  open, initial, projects, clients, onClose, onSaved, onDelete,
}: {
  open: boolean
  initial: FinanceRecurring | null
  projects: FinanceProject[]
  clients: FinanceClient[]
  onClose: () => void
  onSaved: () => void
  onDelete?: () => void
}) {
  const { t, tMethod } = useFinanceLang()
  const [f, setF] = useState(blank())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setF(initial
      ? {
          title: initial.title, type: initial.type, amount: String(initial.amount),
          currency: initial.currency, interval: initial.interval,
          startDate: initial.startDate || today(), endDate: initial.endDate || '',
          clientId: initial.clientId ?? '', projectId: initial.projectId ?? '',
          method: initial.method, category: initial.category, note: initial.note,
          active: initial.active,
        }
      : blank())
  }, [open, initial])

  const set = (k: keyof ReturnType<typeof blank>) => (v: string) => setF((p) => ({ ...p, [k]: v }))

  // Picking a project pulls its client, and its currency only for a NEW, still
  // empty schedule — changing it on an existing one would silently reprice it.
  const onProject = (id: string) => {
    setF((p) => {
      const proj = projects.find((x) => x.id === id)
      const mayAdoptCurrency = !initial && !p.amount.trim()
      return {
        ...p,
        projectId: id,
        currency: proj && mayAdoptCurrency ? proj.currency : p.currency,
        clientId: proj && proj.clientId ? proj.clientId : p.clientId,
      }
    })
  }

  const intervalLabel: Record<string, string> = {
    monthly: t('rec.intervalMonthly'),
    quarterly: t('rec.intervalQuarterly'),
    yearly: t('rec.intervalYearly'),
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (f.endDate && f.endDate < f.startDate) { toast.error(t('rec.saveFail')); return }
    setBusy(true)
    try {
      const payload = {
        title: f.title,
        type: f.type,
        amount: Number(f.amount || 0),
        currency: f.currency,
        interval: f.interval,
        startDate: f.startDate,
        endDate: f.endDate,
        clientId: f.clientId || null,
        projectId: f.projectId || null,
        method: f.method,
        category: f.category,
        note: f.note,
        active: f.active,
      }
      const res = await fetch(
        initial ? `/api/finance/recurring/${initial.id}` : '/api/finance/recurring',
        {
          method: initial ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      if (res.status === 401) { window.location.href = '/admin/finance/unlock'; return }
      if (!res.ok) { toast.error(t('rec.saveFail')); setBusy(false); return }
      toast.success(initial ? t('rec.updated') : t('rec.added'))
      onSaved()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? t('rec.editTitle') : t('rec.newTitle')}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('rec.name')}>
          <Text value={f.title} onChange={set('title')} required placeholder={t('rec.namePlaceholder')} maxLength={200} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('rec.type')}>
            <Select
              value={f.type}
              onChange={set('type')}
              options={TRANSACTION_TYPES.map((x) => ({ value: x, label: x === 'income' ? t('txns.filterIncome') : t('txns.filterExpense') }))}
            />
          </Field>
          <Field label={t('rec.interval')}>
            <Select
              value={f.interval}
              onChange={set('interval')}
              options={RECUR_INTERVALS.map((x) => ({ value: x, label: intervalLabel[x] }))}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('rec.amount')}><NumberField value={f.amount} onChange={set('amount')} placeholder="0" /></Field>
          <Field label={t('rec.currency')}>
            <Select value={f.currency} onChange={set('currency')} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('rec.startDate')}>
            <Text value={f.startDate} onChange={set('startDate')} type="date" required />
          </Field>
          <Field label={t('rec.endDate')} hint={t('rec.endDateHint')}>
            <Text value={f.endDate} onChange={set('endDate')} type="date" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('rec.client')}>
            <Select
              value={f.clientId}
              onChange={set('clientId')}
              options={[{ value: '', label: t('common.none') }, ...clients.map((c) => ({ value: c.id, label: c.company || c.name }))]}
            />
          </Field>
          <Field label={t('rec.project')}>
            <Select
              value={f.projectId}
              onChange={onProject}
              options={[{ value: '', label: t('common.none') }, ...projects.map((p) => ({ value: p.id, label: p.title }))]}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('rec.category')}>
            <Text value={f.category} onChange={set('category')} placeholder={t('rec.namePlaceholder')} maxLength={100} />
          </Field>
          <Field label={t('rec.method')}>
            <Select value={f.method} onChange={set('method')} options={PAYMENT_METHODS.map((m) => ({ value: m, label: tMethod(m) }))} />
          </Field>
        </div>

        <Field label={t('rec.note')}><Area value={f.note} onChange={set('note')} rows={2} /></Field>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={f.active}
            onChange={(e) => setF((p) => ({ ...p, active: e.target.checked }))}
            className="w-4 h-4 rounded accent-[#C8FF47] cursor-pointer"
          />
          <span className="text-[13px] text-[#bbb]">{t('rec.active')}</span>
        </label>

        <FormActions
          busy={busy}
          onCancel={onClose}
          onDelete={initial ? onDelete : undefined}
          submitLabel={initial ? t('common.save') : t('rec.add')}
        />
      </form>
    </Modal>
  )
}
