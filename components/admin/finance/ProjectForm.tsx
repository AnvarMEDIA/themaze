'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from './Modal'
import { Field, Text, Area, Select, NumberField, FormActions } from './fields'
import { CURRENCIES, PROJECT_STATUSES, type Currency, type FinanceClient, type FinanceProject } from '@/lib/finance/types'
import { formatMoney } from '@/lib/finance/money'
import { STATUS_LABEL } from './tokens'

const today = () => new Date().toISOString().slice(0, 10)

export function ProjectForm({
  open, initial, clients, onClose, onSaved,
}: {
  open: boolean
  initial: FinanceProject | null
  clients: FinanceClient[]
  onClose: () => void
  onSaved: () => void
}) {
  const blank = {
    title: '', clientId: '', amount: '', currency: 'UZS',
    status: 'active', startDate: today(), endDate: '', description: '',
    prepayment: '', prepaymentDate: today(),
  }
  const [f, setF] = useState(blank)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setF(initial
      ? {
          title: initial.title, clientId: initial.clientId ?? '', amount: String(initial.amount),
          currency: initial.currency, status: initial.status,
          startDate: initial.startDate || today(), endDate: initial.endDate || '', description: initial.description,
          prepayment: '', prepaymentDate: today(),
        }
      : blank)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const payload = {
        title: f.title,
        clientId: f.clientId || null,
        amount: Number(f.amount || 0),
        currency: f.currency,
        status: f.status,
        startDate: f.startDate,
        endDate: f.endDate,
        description: f.description,
      }
      const res = await fetch(
        initial ? `/api/finance/projects/${initial.id}` : '/api/finance/projects',
        { method: initial ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
      )
      if (res.status === 401) { window.location.href = '/admin/finance/unlock'; return }
      if (!res.ok) { toast.error('Could not save project'); setBusy(false); return }

      const saved = (await res.json()) as FinanceProject
      // New project with a prepayment → record it as a linked income payment so
      // the ledger, dashboard and "received/outstanding" all stay consistent.
      const prepay = Number(f.prepayment || 0)
      if (!initial && prepay > 0) {
        const txnRes = await fetch('/api/finance/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'income',
            amount: prepay,
            currency: f.currency,
            date: f.prepaymentDate || today(),
            projectId: saved.id,
            clientId: f.clientId || null,
            method: 'bank',
            category: 'Prepayment',
            note: '',
          }),
        })
        if (!txnRes.ok) toast.error('Project saved, but the prepayment could not be recorded')
      }

      toast.success(initial ? 'Project updated' : 'Project added')
      onSaved()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit project' : 'New project'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title"><Text value={f.title} onChange={set('title')} required placeholder="e.g. Brand identity for Acme" maxLength={200} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Client">
            <Select
              value={f.clientId}
              onChange={set('clientId')}
              options={[{ value: '', label: '— None —' }, ...clients.map((c) => ({ value: c.id, label: c.company || c.name }))]}
            />
          </Field>
          <Field label="Status">
            <Select value={f.status} onChange={set('status')} options={PROJECT_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Total amount"><NumberField value={f.amount} onChange={set('amount')} placeholder="0" /></Field>
          <Field label="Currency">
            <Select value={f.currency} onChange={set('currency')} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
          </Field>
        </div>

        {!initial && (
          <div className="rounded-lg border border-[#1E1E1E] bg-[#0B0B0B] p-3.5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prepayment" hint="Optional — recorded as the first payment">
                <NumberField value={f.prepayment} onChange={set('prepayment')} placeholder="0" />
              </Field>
              <Field label="Prepayment date"><Text value={f.prepaymentDate} onChange={set('prepaymentDate')} type="date" /></Field>
            </div>
            {Number(f.prepayment || 0) > 0 && Number(f.amount || 0) > 0 && (
              <p className="text-[11px] text-[#666] mt-2 tabular-nums">
                Remaining after prepayment: {formatMoney(Math.max(0, Number(f.amount) - Number(f.prepayment)), f.currency as Currency)}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date"><Text value={f.startDate} onChange={set('startDate')} type="date" /></Field>
          <Field label="End date"><Text value={f.endDate} onChange={set('endDate')} type="date" /></Field>
        </div>
        <Field label="Description"><Area value={f.description} onChange={set('description')} placeholder="Scope, deliverables…" rows={2} /></Field>
        <FormActions busy={busy} onCancel={onClose} submitLabel={initial ? 'Save changes' : 'Add project'} />
      </form>
    </Modal>
  )
}
