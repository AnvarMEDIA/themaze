'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import toast from 'react-hot-toast'
import type { Testimonial } from '@/lib/testimonials'
import { compressImage } from '@/lib/compressImage'

const EMPTY = (): Testimonial => ({
  id:       crypto.randomUUID(),
  author:   '',
  role:     '',
  roleRu:   '',
  quote:    '',
  quoteRu:  '',
  avatar:   '',
  rating:   5,
  featured: false,
  order:    Date.now(),
})

export default function AdminTestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/testimonials', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: Testimonial[]) => setItems(data))
      .catch(() => toast.error('Failed to load testimonials'))
      .finally(() => setLoading(false))
  }, [])

  const set = (id: string, key: keyof Testimonial, value: Testimonial[keyof Testimonial]) => {
    setItems((prev) => prev.map((t) => t.id === id ? { ...t, [key]: value } : t))
    setDirty(true)
  }

  const add = () => {
    setItems((prev) => [...prev, EMPTY()])
    setDirty(true)
  }

  const remove = (id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
    setDirty(true)
  }

  const persistOrder = useCallback(async (ordered: Testimonial[]) => {
    setSavingOrder(true)
    try {
      const res = await fetch('/api/testimonials/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ordered.map((t) => t.id) }),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast.error('Reorder failed')
    } finally {
      setSavingOrder(false)
    }
  }, [])

  const handleReorder = (next: Testimonial[]) => {
    setItems(next.map((t, i) => ({ ...t, order: i + 1 })))
    if (dirty) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => persistOrder(next), 400)
  }

  const uploadAvatar = async (id: string, original: File) => {
    setUploading(id)
    try {
      const file = await compressImage(original)
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'testimonials')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error()
      const { url } = await res.json()
      set(id, 'avatar', url)
      toast.success('Avatar uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(null)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const numbered = items.map((t, i) => ({ ...t, order: i + 1 }))
      const res = await fetch('/api/testimonials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(numbered),
      })
      if (!res.ok) throw new Error()
      setItems(numbered)
      setDirty(false)
      toast.success('Testimonials saved!')
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full bg-[#111] border border-[#252525] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#C8FF47] transition-colors'
  const textareaClass = inputClass + ' resize-none'

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Testimonials</h1>
          <p className="text-sm text-[#555] mt-1">
            Client quotes shown on Home / About. Drag ⋮⋮ to reorder.
            {savingOrder && <span className="ml-2 text-[#C8FF47]">· saving order…</span>}
            {dirty && !savingOrder && <span className="ml-2 text-[#C8FF47]">· unsaved changes</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={add}
            className="px-4 py-2 border border-[#252525] rounded-lg text-sm text-[#999] hover:text-white hover:border-[#444] transition-colors"
          >
            + Add testimonial
          </button>
          <button
            onClick={save}
            disabled={saving || loading}
            className="px-6 py-2.5 bg-[#C8FF47] text-[#0A0A0A] font-bold rounded-lg text-sm hover:bg-[#F0EEE6] transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-[#444] text-sm">
          No testimonials yet.{' '}
          <button onClick={add} className="text-[#C8FF47] hover:underline">Add one</button>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={items}
          onReorder={handleReorder}
          as="div"
          className="space-y-4"
        >
          {items.map((t, i) => (
            <Card
              key={t.id}
              item={t}
              index={i}
              uploading={uploading === t.id}
              inputClass={inputClass}
              textareaClass={textareaClass}
              onChange={(k, v) => set(t.id, k, v)}
              onAvatarUpload={(f) => uploadAvatar(t.id, f)}
              onRemove={() => remove(t.id)}
            />
          ))}
        </Reorder.Group>
      )}
    </div>
  )
}

interface CardProps {
  item: Testimonial
  index: number
  uploading: boolean
  inputClass: string
  textareaClass: string
  onChange: (key: keyof Testimonial, val: Testimonial[keyof Testimonial]) => void
  onAvatarUpload: (file: File) => void
  onRemove: () => void
}

function Card({ item, index, uploading, inputClass, textareaClass, onChange, onAvatarUpload, onRemove }: CardProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const controls = useDragControls()
  const initials = item.author
    ? item.author.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      as="div"
      whileDrag={{ scale: 1.01, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', zIndex: 10 }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
    >
      <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1E1E1E]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onPointerDown={(e) => controls.start(e)}
              className="cursor-grab active:cursor-grabbing touch-none text-[#444] hover:text-[#C8FF47] focus:text-[#C8FF47] focus:outline-none transition-colors select-none text-lg leading-none"
              aria-label="Drag to reorder"
              title="Drag to reorder"
            >
              ⋮⋮
            </button>
            <span className="text-xs font-semibold tracking-[0.1em] uppercase text-[#444]">
              #{index + 1}
            </span>
            <label className="flex items-center gap-2 text-xs text-[#888] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!item.featured}
                onChange={(e) => onChange('featured', e.target.checked)}
                className="accent-maze-lime"
              />
              Featured
            </label>
          </div>
          <button
            onClick={onRemove}
            aria-label={`Remove testimonial from ${item.author}`}
            className="p-1.5 rounded text-[#444] hover:text-red-400 focus:outline-none transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-5 flex gap-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Change avatar"
              className="w-20 h-20 rounded-full border border-[#252525] overflow-hidden bg-[#1A1A1A] flex items-center justify-center cursor-pointer relative focus:outline-none focus:border-[#C8FF47]"
            >
              {item.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.avatar} alt={item.author} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-black text-[#333]" aria-hidden="true">{initials}</span>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <span className="text-xs text-[#C8FF47]">...</span>
                </div>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onAvatarUpload(f)
                e.target.value = ''
              }}
            />
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange('rating', n)}
                  aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                  className={`text-sm ${n <= (item.rating ?? 5) ? 'text-[#C8FF47]' : 'text-[#333]'} hover:scale-110 transition-transform`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#555] block mb-1">Author</label>
                <input
                  type="text"
                  placeholder="Farrukh Karimov"
                  value={item.author}
                  onChange={(e) => onChange('author', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#555] block mb-1">Role (EN)</label>
                <input
                  type="text"
                  placeholder="CEO, Uzum Market"
                  value={item.role}
                  onChange={(e) => onChange('role', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#555] block mb-1">Role (RU)</label>
              <input
                type="text"
                placeholder="CEO, Uzum Market"
                value={item.roleRu}
                onChange={(e) => onChange('roleRu', e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#555] block mb-1">Quote (EN)</label>
                <textarea
                  rows={3}
                  placeholder="They nailed the brand on the first round…"
                  value={item.quote}
                  onChange={(e) => onChange('quote', e.target.value)}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#555] block mb-1">Quote (RU)</label>
                <textarea
                  rows={3}
                  placeholder="С первого подхода попали в бренд…"
                  value={item.quoteRu}
                  onChange={(e) => onChange('quoteRu', e.target.value)}
                  className={textareaClass}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Reorder.Item>
  )
}
