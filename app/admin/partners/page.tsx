'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import type { Partner } from '@/lib/partners'
import type { SiteSettings } from '@/lib/settings'
import toast from 'react-hot-toast'
import { compressImage } from '@/lib/compressImage'

const EMPTY: Omit<Partner, 'id' | 'order'> = { name: '', logo: '', url: '' }

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading,  setLoading]  = useState(true)
  const [form,     setForm]     = useState(EMPTY)
  const [editing,  setEditing]  = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const [visible, setVisible] = useState<boolean | null>(null)
  const [savingVisibility, setSavingVisibility] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Load the current visibility setting on mount.
  useEffect(() => {
    let cancelled = false
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() as Promise<SiteSettings> : null)
      .then((s) => { if (!cancelled && s) setVisible(!!s.partnersVisible) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const toggleVisibility = async () => {
    if (visible === null || savingVisibility) return
    const next = !visible
    setSavingVisibility(true)
    setVisible(next)  // optimistic
    try {
      const cur = await fetch('/api/settings', { cache: 'no-store' }).then((r) => r.json() as Promise<SiteSettings>)
      const res = await fetch('/api/settings', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...cur, partnersVisible: next }),
      })
      if (!res.ok) throw new Error()
      toast.success(next ? 'Блок «Партнёры» показан на сайте' : 'Блок «Партнёры» скрыт с сайта')
    } catch {
      setVisible(!next)  // revert
      toast.error('Не удалось сохранить')
    } finally {
      setSavingVisibility(false)
    }
  }

  const persistOrder = useCallback(async (ordered: Partner[]) => {
    setSavingOrder(true)
    try {
      const res = await fetch('/api/partners/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ordered.map((p) => p.id) }),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast.error('Reorder failed — reloading')
      load()
    } finally {
      setSavingOrder(false)
    }
  }, [load])

  const handleReorder = (next: Partner[]) => {
    setPartners(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => persistOrder(next), 400)
  }

  const uploadLogo = async (original: File) => {
    setUploading(true)
    try {
      const file = await compressImage(original)
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'partners')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload failed')
      const { url } = await res.json() as { url: string }
      setForm((p) => ({ ...p, logo: url }))
      toast.success('Лого загружено')
    } catch {
      toast.error('Ошибка загрузки')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Drop any debounced reorder still queued — the create/update below
    // changes the list, and load() will pull the authoritative order.
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
    setSaving(true)
    try {
      const payload = { ...form, order: editing
        ? partners.find((p) => p.id === editing)?.order ?? partners.length
        : partners.length }
      if (editing) {
        const res = await fetch(`/api/partners/${editing}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        toast.success('Partner updated')
      } else {
        const res = await fetch('/api/partners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        toast.success('Partner added')
      }
      setForm(EMPTY)
      setEditing(null)
      await load()
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (partner: Partner) => {
    setEditing(partner.id)
    setForm({ name: partner.name, logo: partner.logo, url: partner.url ?? '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from partners?`)) return
    // Cancel any queued reorder so it can't re-apply a stale list.
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
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
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Partners & Clients</h1>
          <p className="text-sm text-[#555] mt-1">
            Manage logos shown on the homepage.
            {savingOrder && <span className="ml-2 text-[#C8FF47]">· saving order…</span>}
          </p>
        </div>

        {/* Public visibility toggle */}
        <div className="flex items-center gap-3 rounded-xl border border-[#1E1E1E] bg-[#0D0D0D] px-4 py-3">
          <div className="text-right">
            <p className="text-xs font-medium text-white">Показывать на сайте</p>
            <p className="text-[11px] text-[#555] mt-0.5">
              {visible === null ? '…' : visible ? 'Блок виден на главной' : 'Блок скрыт с главной'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={visible === true}
            aria-label="Toggle partners block visibility"
            disabled={visible === null || savingVisibility}
            onClick={toggleVisibility}
            className={[
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50',
              visible ? 'bg-[#C8FF47]' : 'bg-[#252525]',
            ].join(' ')}
          >
            <span
              className={[
                'inline-block h-4 w-4 rounded-full bg-[#0A0A0A] transition-transform',
                visible ? 'translate-x-[22px]' : 'translate-x-[4px]',
              ].join(' ')}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">

        {/* Form */}
        <div className="xl:col-span-2">
          <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-6">
            <h2 className="text-sm font-semibold text-white mb-5">
              {editing ? 'Edit partner' : 'Add partner'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Logo upload */}
              <div>
                <label className="text-xs font-medium text-[#555] block mb-2">Logo</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) uploadLogo(file)
                    e.target.value = ''
                  }}
                />

                <div className="flex items-center gap-3">
                  {/* Preview */}
                  <button
                    type="button"
                    className="w-20 h-14 rounded-lg border border-[#252525] bg-[#111] flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:border-[#C8FF47] focus:outline-none focus:border-[#C8FF47] transition-colors"
                    onClick={() => fileRef.current?.click()}
                    aria-label="Upload logo"
                    title="Click to upload logo"
                  >
                    {uploading ? (
                      <span className="w-4 h-4 border border-[#C8FF47] border-t-transparent rounded-full animate-spin" />
                    ) : form.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.logo} alt="logo" className="max-h-10 max-w-[70px] object-contain" />
                    ) : (
                      <span className="text-[#444] text-xs text-center leading-tight px-1">Click<br/>to upload</span>
                    )}
                  </button>

                  <div className="flex-1 space-y-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="w-full py-2 text-xs font-medium bg-[#1A1A1A] border border-[#252525] rounded-lg text-[#888] hover:border-[#C8FF47] hover:text-[#C8FF47] transition-colors disabled:opacity-50"
                    >
                      {uploading ? 'Загрузка…' : 'Загрузить лого'}
                    </button>
                    {form.logo && (
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, logo: '' }))}
                        className="w-full py-1.5 text-xs text-[#555] hover:text-red-400 transition-colors"
                      >
                        Удалить лого
                      </button>
                    )}
                  </div>
                </div>
              </div>

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
                <label className="text-xs font-medium text-[#555] block mb-1.5">Website URL</label>
                <input
                  type="url"
                  placeholder="https://company.uz"
                  value={form.url}
                  onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
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

            <p className="px-5 py-2 text-[11px] text-[#444] border-b border-[#1E1E1E]">
              Drag the ⋮⋮ handle to reorder. Order is applied on the homepage.
            </p>

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
              <Reorder.Group
                axis="y"
                values={partners}
                onReorder={handleReorder}
                as="div"
              >
                {partners.map((partner, i) => (
                  <PartnerRow
                    key={partner.id}
                    partner={partner}
                    index={i}
                    editing={editing === partner.id}
                    onEdit={() => handleEdit(partner)}
                    onDelete={() => handleDelete(partner.id, partner.name)}
                  />
                ))}
              </Reorder.Group>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

function PartnerRow({
  partner, index, editing, onEdit, onDelete,
}: {
  partner:  Partner
  index:    number
  editing:  boolean
  onEdit:   () => void
  onDelete: () => void
}) {
  const controls = useDragControls()

  return (
    <Reorder.Item
      value={partner}
      dragListener={false}
      dragControls={controls}
      as="div"
      whileDrag={{
        scale: 1.01,
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        zIndex: 10,
      }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
    >
      <div
        className={`flex items-center gap-4 px-5 py-4 border-b border-[#1A1A1A] last:border-b-0 hover:bg-[#111] transition-colors ${
          editing ? 'bg-[#111] border-l-2 border-l-[#C8FF47]' : ''
        }`}
      >
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className="cursor-grab active:cursor-grabbing touch-none text-[#444] hover:text-[#C8FF47] focus:text-[#C8FF47] focus:outline-none transition-colors select-none text-lg leading-none"
          aria-label={`Drag ${partner.name} to reorder`}
          title="Drag to reorder"
        >
          ⋮⋮
        </button>

        <span className="text-[11px] font-mono text-[#333] w-5 text-center flex-shrink-0">
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Logo preview */}
        <div className="w-12 h-9 rounded-lg bg-[#1A1A1A] border border-[#252525] flex items-center justify-center flex-shrink-0 overflow-hidden">
          {partner.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={partner.logo} alt={partner.name} className="max-h-7 max-w-[44px] object-contain" />
          ) : (
            <span className="text-[#47C8FF] text-sm font-bold" aria-hidden="true">
              {partner.name.charAt(0).toUpperCase()}
            </span>
          )}
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
            onClick={onEdit}
            className="text-xs text-[#555] hover:text-[#C8FF47] transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-[#555] hover:text-red-400 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </Reorder.Item>
  )
}
