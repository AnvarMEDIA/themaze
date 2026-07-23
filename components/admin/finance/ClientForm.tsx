'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from './Modal'
import { Field, Text, Area, Select, FormActions } from './fields'
import { useFinanceLang } from './lang'
import type { FinanceClient } from '@/lib/finance/types'

const empty = { name: '', company: '', email: '', phone: '', notes: '', status: 'active' }

export function ClientForm({
  open, initial, onClose, onSaved,
}: {
  open: boolean
  initial: FinanceClient | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useFinanceLang()
  const [f, setF] = useState(empty)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setF(initial
      ? { name: initial.name, company: initial.company, email: initial.email, phone: initial.phone, notes: initial.notes, status: initial.status }
      : empty)
  }, [open, initial])

  const set = (k: keyof typeof empty) => (v: string) => setF((p) => ({ ...p, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch(
        initial ? `/api/finance/clients/${initial.id}` : '/api/finance/clients',
        {
          method: initial ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(f),
        },
      )
      if (res.status === 401) { window.location.href = '/admin/finance/unlock'; return }
      if (!res.ok) { toast.error(t('cf.saveFail')); setBusy(false); return }
      toast.success(initial ? t('cf.updated') : t('cf.added'))
      onSaved()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? t('cf.editTitle') : t('cf.newTitle')}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('cf.name')}><Text value={f.name} onChange={set('name')} required placeholder={t('cf.namePlaceholder')} maxLength={120} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('cf.company')}><Text value={f.company} onChange={set('company')} placeholder={t('common.optional')} maxLength={120} /></Field>
          <Field label={t('cf.status')}>
            <Select value={f.status} onChange={set('status')} options={[{ value: 'active', label: t('cf.stActive') }, { value: 'archived', label: t('cf.stArchived') }]} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('cf.email')}><Text value={f.email} onChange={set('email')} type="email" placeholder="name@company.com" maxLength={254} /></Field>
          <Field label={t('cf.phone')}><Text value={f.phone} onChange={set('phone')} placeholder="+998…" maxLength={40} /></Field>
        </div>
        <Field label={t('cf.notes')}><Area value={f.notes} onChange={set('notes')} placeholder={t('cf.notesPlaceholder')} rows={3} /></Field>
        <FormActions busy={busy} onCancel={onClose} submitLabel={initial ? t('cf.saveChanges') : t('cf.add')} />
      </form>
    </Modal>
  )
}
