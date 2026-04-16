'use client'

import { useEffect, useState } from 'react'
import type { SiteSettings } from '@/lib/settings'
import toast from 'react-hot-toast'

const DEFAULT: SiteSettings = {
  email: '', phone: '', telegram: '',
  address: '', addressDetail: '',
  instagram: '', behance: '', linkedin: '', twitter: '',
}

export default function AdminSettingsPage() {
  const [form,    setForm]    = useState<SiteSettings>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: SiteSettings) => setForm(data))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast.success('Settings saved!')
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof SiteSettings, val: string) =>
    setForm((p) => ({ ...p, [key]: val }))

  const inputClass =
    'w-full bg-[#111] border border-[#252525] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#C8FF47] transition-colors'

  const groups: { title: string; fields: { key: keyof SiteSettings; label: string; placeholder: string; type?: string }[] }[] = [
    {
      title: 'Contact Information',
      fields: [
        { key: 'email',    label: 'Email',    placeholder: 'hello@maze.uz', type: 'email' },
        { key: 'phone',    label: 'Phone',    placeholder: '+998 71 123 45 67' },
        { key: 'telegram', label: 'Telegram', placeholder: '@mazestudio' },
      ],
    },
    {
      title: 'Location',
      fields: [
        { key: 'address',       label: 'City / Country', placeholder: 'Tashkent, Uzbekistan' },
        { key: 'addressDetail', label: 'Address detail',  placeholder: 'Mirzo Ulugbek district' },
      ],
    },
    {
      title: 'Social Media',
      fields: [
        { key: 'instagram', label: 'Instagram URL',  placeholder: 'https://instagram.com/mazestudio' },
        { key: 'behance',   label: 'Behance URL',    placeholder: 'https://behance.net/mazestudio' },
        { key: 'linkedin',  label: 'LinkedIn URL',   placeholder: 'https://linkedin.com/company/mazestudio' },
        { key: 'telegram',  label: 'Telegram',       placeholder: '@mazestudio or https://t.me/mazestudio' },
        { key: 'twitter',   label: 'Twitter / X URL', placeholder: 'https://x.com/mazestudio' },
      ],
    },
  ]

  return (
    <div className="px-8 py-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Site Settings</h1>
        <p className="text-sm text-[#555] mt-1">Manage contact info, location and social links.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-[#0D0D0D] border border-[#1E1E1E] animate-pulse" />
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {groups.map((group) => (
            <div key={group.title} className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#1E1E1E]">
                <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-[#555]">{group.title}</h2>
              </div>
              <div className="p-5 space-y-4">
                {group.fields.map(({ key, label, placeholder, type }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-[#555] block mb-1.5">{label}</label>
                    <input
                      type={type ?? 'text'}
                      placeholder={placeholder}
                      value={form[key]}
                      onChange={(e) => set(key, e.target.value)}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#C8FF47] text-[#0A0A0A] font-bold rounded-lg text-sm hover:bg-[#F0EEE6] transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
            <p className="text-xs text-[#444]">Changes apply immediately on the site.</p>
          </div>
        </form>
      )}
    </div>
  )
}
