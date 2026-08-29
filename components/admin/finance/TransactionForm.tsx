'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from './Modal'
import { Field, Text, Area, Select, NumberField, FormActions } from './fields'
import {
  CURRENCIES, EXPENSE_KINDS, PAYMENT_METHODS, TRANSACTION_TYPES,
  type FinanceClient, type FinanceProject, type FinanceTransaction,
} from '@/lib/finance/types'
import { suggestKind } from '@/lib/finance/expenseKind'
import { useFinanceLang } from './lang'
import { todayLocal } from '@/lib/finance/date'

const today = todayLocal

const base = () => ({
  type: 'income', amount: '', currency: 'UZS', date: today(),
  projectId: '', clientId: '', method: 'bank', category: '', note: '',
  expenseKind: '', payee: '',
})

export function TransactionForm({
  open, initial, projects, clients, payees = [], onClose, onSaved, onDelete,
}: {
  open: boolean
  initial: FinanceTransaction | null
  projects: FinanceProject[]
  clients: FinanceClient[]
  /** Payees already used, so a name is picked rather than retyped. */
  payees?: string[]
  onClose: () => void
  onSaved: () => void
  onDelete?: () => void
}) {
  const { t, locale, tMethod, tKind } = useFinanceLang()
  const [f, setF] = useState(base())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setF(initial
      ? {
          type: initial.type, amount: String(initial.amount), currency: initial.currency, date: initial.date || today(),
          projectId: initial.projectId ?? '', clientId: initial.clientId ?? '', method: initial.method,
          category: initial.category, note: initial.note,
          expenseKind: initial.expenseKind ?? '', payee: initial.payee ?? '',
        }
      : base())
  }, [open, initial])

  const set = (k: keyof ReturnType<typeof base>) => (v: string) => setF((p) => ({ ...p, [k]: v }))

  /**
   * Typing the category on a NEW expense fills in the kind and payee if they
   * are still blank. A convenience, never an override: once either field has
   * been touched, or on an existing row, the entry is left alone.
   */
  const onCategory = (v: string) => {
    setF((p) => {
      const next = { ...p, category: v }
      if (initial || p.type !== 'expense' || p.expenseKind || p.payee) return next
      const s = suggestKind({ category: v, note: p.note, payee: '' })
      if (s.reason === 'none') return next
      return { ...next, expenseKind: s.kind, payee: s.payee }
    })
  }

  // Selecting a project pulls its client, and its currency only as a
  // convenience for a NEW, still-empty entry. Never on an existing record:
  // silently swapping the currency there would turn $1,000 into 1,000 so'm.
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
        // Expense-only. Sent as undefined on income so a row that was flipped
        // from expense to income doesn't keep a stale kind.
        expenseKind: f.type === 'expense' && f.expenseKind ? f.expenseKind : undefined,
        payee: f.type === 'expense' && f.payee.trim() ? f.payee.trim() : undefined,
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
          <Field label={t('tf.category')}><Text value={f.category} onChange={income ? set('category') : onCategory} placeholder={income ? t('tf.categoryIncome') : t('tf.categoryExpense')} maxLength={100} /></Field>
        </div>

        {/* What kind of spending, and who got it. Only for expenses: income has
            a client and a project, which already say where it came from. */}
        {!income && (
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-[#1E1E1E] bg-[#0B0B0B] p-3.5">
            <Field label={t('tf.expenseKind')} hint={t('tf.expenseKindHint')}>
              <Select
                value={f.expenseKind}
                onChange={set('expenseKind')}
                options={[{ value: '', label: t('exp.unclassified') }, ...EXPENSE_KINDS.map((k) => ({ value: k, label: tKind(k) }))]}
              />
            </Field>
            <Field label={t('tf.payee')} hint={t('tf.payeeHint')}>
              <input
                list="fin-payees"
                value={f.payee}
                onChange={(e) => set('payee')(e.target.value)}
                maxLength={120}
                placeholder={t('tf.payeePlaceholder')}
                className="w-full bg-[#111] border border-[#252525] rounded-lg px-3.5 py-2.5 text-sm text-[#EDEBE3] placeholder:text-[#4A4A4A] focus:outline-none focus:border-[#C8FF47] transition-colors"
              />
              <datalist id="fin-payees">
                {payees.map((p) => <option key={p} value={p} />)}
              </datalist>
            </Field>
          </div>
        )}

        {/* What this row is pegged at. Shown only when it is in another
            currency, where the question actually arises. */}
        {initial && initial.currency !== initial.fxBase && initial.fxRate ? (
          <p className="text-[11px] text-[#8FC748]">
            {t('tf.fxLocked', { rate: initial.fxRate.toLocaleString(locale), date: initial.fxDate ?? initial.date })}
          </p>
        ) : initial && !initial.fxRate && initial.currency !== 'UZS' ? (
          <p className="text-[11px] text-[#FFD447]">{t('tf.fxFloating')}</p>
        ) : null}

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
