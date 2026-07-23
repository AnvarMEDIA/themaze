'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from './Modal'
import { Field, Text, Area, Select, FormActions } from './fields'
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
      if (!res.ok) { toast.error('Could not save client'); setBusy(false); return }
      toast.success(initial ? 'Client updated' : 'Client added')
      onSaved()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit client' : 'New client'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name"><Text value={f.name} onChange={set('name')} required placeholder="Contact or company name" maxLength={120} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company"><Text value={f.company} onChange={set('company')} placeholder="Optional" maxLength={120} /></Field>
          <Field label="Status">
            <Select value={f.status} onChange={set('status')} options={[{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }]} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><Text value={f.email} onChange={set('email')} type="email" placeholder="name@company.com" maxLength={254} /></Field>
          <Field label="Phone"><Text value={f.phone} onChange={set('phone')} placeholder="+998…" maxLength={40} /></Field>
        </div>
        <Field label="Notes"><Area value={f.notes} onChange={set('notes')} placeholder="Anything worth remembering" rows={3} /></Field>
        <FormActions busy={busy} onCancel={onClose} submitLabel={initial ? 'Save changes' : 'Add client'} />
      </form>
    </Modal>
  )
}
