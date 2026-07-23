'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from './Modal'
import { Field, Text, Area, Select, NumberField, FormActions } from './fields'
import {
  CURRENCIES, PAYMENT_METHODS, TRANSACTION_TYPES,
  type FinanceClient, type FinanceProject, type FinanceTransaction,
} from '@/lib/finance/types'
import { useFinanceLang } from './lang'

const today = () => new Date().toISOString().slice(0, 10)

const base = () => ({
  type: 'income', amount: '', currency: 'UZS', date: today(),
  projectId: '', clientId: '', method: 'bank', category: '', note: '',
})

export function TransactionForm({
  open, initial, projects, clients, onClose, onSaved, onDelete,
}: {
  open: boolean
  initial: FinanceTransaction | null
  projects: FinanceProject[]
  clients: FinanceClient[]
  onClose: () => void
  onSaved: () => void
  onDelete?: () => void
}) {
  const { t, tMethod } = useFinanceLang()
  const [f, setF] = useState(base())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setF(initial
      ? {
          type: initial.type, amount: String(initial.amount), currency: initial.currency, date: initial.date || today(),
          projectId: initial.projectId ?? '', clientId: initial.clientId ?? '', method: initial.method,
          category: initial.category, note: initial.note,
        }
      : base())
  }, [open, initial])

  const set = (k: keyof ReturnType<typeof base>) => (v: string) => setF((p) => ({ ...p, [k]: v }))

  // Selecting a project pulls its currency + client for convenience.
  const onProject = (id: string) => {
    setF((p) => {
      const proj = projects.find((x) => x.id === id)
      return {
        ...p,
        projectId: id,
        currency: proj ? proj.currency : p.currency,
        clientId: proj && proj.clientId ? proj.clientId : p.clientId,
      }
    })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const payload = {
        type: f.type,
        amount: Number(f.amount || 0),
        currency: f.currency,
        date: f.date,
        projectId: f.projectId || null,
        clientId: f.clientId || null,
        method: f.method,
        category: f.category,
        note: f.note,
      }
      const res = await fetch(
        initial ? `/api/finance/transactions/${initial.id}` : '/api/finance/transactions',
        { method: initial ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
      )
      if (res.status === 401) { window.location.href = '/admin/finance/unlock'; return }
      if (!res.ok) { toast.error(t('tf.saveFail')); setBusy(false); return }
      toast.success(initial ? t('tf.updated') : f.type === 'income' ? t('tf.paymentRecorded') : t('tf.expenseRecorded'))
      onSaved()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const income = f.type === 'income'

  return (
    <Modal open={open} onClose={onClose} title={initial ? t('tf.editTitle') : t('tf.newTitle')}>
      <form onSubmit={submit} className="space-y-4">
        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-2">
          {TRANSACTION_TYPES.map((ty) => (
            <button
              type="button"
              key={ty}
              onClick={() => set('type')(ty)}
              className={`py-2.5 rounded-lg text-sm font-medium border transition-colors active:scale-[0.98] ${
                f.type === ty
                  ? ty === 'income'
                    ? 'border-[#6FA02E] bg-[#6FA02E]/12 text-[#8FC748]'
                    : 'border-[#D9563A] bg-[#D9563A]/12 text-[#E27A5C]'
                  : 'border-[#252525] text-[#888] hover:text-white'
              }`}
            >
              {ty === 'income' ? t('tf.income') : t('tf.expense')}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={income ? t('tf.amountReceived') : t('tf.amountSpent')}><NumberField value={f.amount} onChange={set('amount')} placeholder="0" /></Field>
          <Field label={t('tf.currency')}>
            <Select value={f.currency} onChange={set('currency')} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('tf.date')}><Text value={f.date} onChange={set('date')} type="date" required /></Field>
          <Field label={t('tf.method')}>
            <Select value={f.method} onChange={set('method')} options={PAYMENT_METHODS.map((m) => ({ value: m, label: tMethod(m) }))} />
          </Field>
        </div>

        <Field label={t('tf.project')} hint={income ? t('tf.projectHint') : undefined}>
          <Select
            value={f.projectId}
            onChange={onProject}
            options={[{ value: '', label: t('common.none') }, ...projects.map((p) => ({ value: p.id, label: p.title }))]}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('tf.client')}>
            <Select
              value={f.clientId}
              onChange={set('clientId')}
              options={[{ value: '', label: t('common.none') }, ...clients.map((c) => ({ value: c.id, label: c.company || c.name }))]}
            />
          </Field>
          <Field label={t('tf.category')}><Text value={f.category} onChange={set('category')} placeholder={income ? t('tf.categoryIncome') : t('tf.categoryExpense')} maxLength={100} /></Field>
        </div>

        <Field label={t('tf.note')}><Area value={f.note} onChange={set('note')} placeholder={t('common.optional')} rows={2} /></Field>
        <FormActions
          busy={busy}
          onCancel={onClose}
          onDelete={initial && onDelete ? onDelete : undefined}
          submitLabel={initial ? t('tf.saveChanges') : income ? t('tf.recordPayment') : t('tf.recordExpense')}
        />
      </form>
    </Modal>
  )
}
