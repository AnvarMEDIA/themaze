'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Partner } from '@/lib/partners'
import toast from 'react-hot-toast'

const EMPTY: Omit<Partner, 'id'> = { name: '', logo: '', url: '', order: 99 }

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading,  setLoading]  = useState(true)
  const [form,     setForm]     = useState(EMPTY)
  const [editing,  setEditing]  = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/partners', { cache: 'no-store' })
      const data = await res.json() as Partner[]
      setPartners(data)
    } catch {
      toast.error('Failed to load partners')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        const res = await fetch(`/api/partners/${editing}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error()
        toast.success('Partner updated')
      } else {
        const res = await fetch('/api/partners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error()
        toast.success('Partner added')
      }
      setForm(EMPTY)
      setEditing(null)
      load()
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (partner: Partner) => {
    setEditing(partner.id)
    setForm({ name: partner.name, logo: partner.logo, url: partner.url ?? '', order: partner.order })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from partners?`)) return
    const prev = partners
    setPartners((p) => p.filter((x) => x.id !== id))
    try {
      const res = await fetch(`/api/partners/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Partner removed')
    } catch {
      setPartners(prev)
      toast.error('Delete failed')
    }
  }

  const inputClass = 'w-full bg-[#111] border border-[#252525] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#C8FF47] transition-colors'

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Partners & Clients</h1>
        <p className="text-sm text-[#555] mt-1">Manage logos shown on the homepage.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">

        {/* Form */}
        <div className="xl:col-span-2">
          <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-6">
            <h2 className="text-sm font-semibold text-white mb-5">
              {editing ? 'Edit partner' : 'Add partner'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#555] block mb-1.5">Company name *</label>
                <input
                  required
                  placeholder="e.g. Uzum Market"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#555] block mb-1.5">Logo path</label>
                <input
                  placeholder="/partners/company.svg"
                  value={form.logo}
                  onChange={(e) => setForm((p) => ({ ...p, logo: e.target.value }))}
                  className={inputClass}
                />
                <p className="text-[11px] text-[#444] mt-1">Place logo in /public/partners/</p>
              </div>
              <div>
                <label className="text-xs font-medium text-[#555] block mb-1.5">Website URL</label>
                <input
                  type="url"
                  placeholder="https://company.uz"
                  value={form.url}
                  onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#555] block mb-1.5">Display order</label>
                <input
                  type="number"
                  min={1}
                  value={form.order}
                  onChange={(e) => setForm((p) => ({ ...p, order: Number(e.target.value) }))}
                  className={inputClass}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#C8FF47] text-[#0A0A0A] font-bold rounded-lg text-sm hover:bg-[#F0EEE6] transition-colors disabled:opacity-60"
                >
                  {saving ? 'Saving…' : editing ? 'Update' : 'Add partner'}
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={() => { setEditing(null); setForm(EMPTY) }}
                    className="px-4 py-2.5 border border-[#252525] text-[#666] rounded-lg text-sm hover:border-[#333] hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Partners list */}
        <div className="xl:col-span-3">
          <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E]">
            <div className="px-5 py-4 border-b border-[#1E1E1E] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">All partners</h2>
              <span className="text-xs text-[#444]">{partners.length} total</span>
            </div>

            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-[#111] animate-pulse" />
                ))}
              </div>
            ) : partners.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-[#444]">No partners yet.</p>
                <p className="text-xs text-[#333] mt-1">Add your first client or partner using the form.</p>
              </div>
            ) : (
              <div>
                {partners.map((partner, i) => (
                  <div
                    key={partner.id}
                    className={`flex items-center gap-4 px-5 py-4 border-b border-[#1A1A1A] last:border-b-0 hover:bg-[#111] transition-colors ${
                      editing === partner.id ? 'bg-[#111] border-l-2 border-l-[#C8FF47]' : ''
                    }`}
                  >
                    {/* Order badge */}
                    <span className="text-[11px] font-mono text-[#333] w-5 text-center flex-shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>

                    {/* Logo preview or icon */}
                    <div className="w-9 h-9 rounded-lg bg-[#1A1A1A] border border-[#252525] flex items-center justify-center flex-shrink-0 text-[#47C8FF] text-sm font-bold">
                      {partner.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{partner.name}</p>
                      {partner.url && (
                        <a
                          href={partner.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#444] hover:text-[#47C8FF] transition-colors truncate block"
                        >
                          {partner.url}
                        </a>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEdit(partner)}
                        className="text-xs text-[#555] hover:text-[#C8FF47] transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(partner.id, partner.name)}
                        className="text-xs text-[#555] hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
