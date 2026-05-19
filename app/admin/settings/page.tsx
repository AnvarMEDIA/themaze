'use client'

import { useEffect, useRef, useState } from 'react'
import type { SiteSettings } from '@/lib/settings'
import toast from 'react-hot-toast'
import { MfaSection } from '@/components/admin/MfaSection'

const DEFAULT: SiteSettings = {
  email: '', phone: '', telegram: '',
  address: '', addressDetail: '',
  instagram: '', behance: '', linkedin: '', twitter: '',
  favicon: '',
}

export default function AdminSettingsPage() {
  const [form,    setForm]    = useState<SiteSettings>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [backing, setBacking] = useState(false)

  const runBackup = async () => {
    setBacking(true)
    try {
      const res = await fetch('/api/backup', { cache: 'no-store' })
      const data = await res.json().catch(() => ({})) as { ok?: boolean; url?: string; error?: string; reason?: string }
      if (!res.ok || data.ok === false) {
        toast.error(data.error ?? data.reason ?? 'Backup failed')
        return
      }
      toast.success(data.url ? 'Backup saved' : 'Backup complete')
    } catch {
      toast.error('Backup failed')
    } finally {
      setBacking(false)
    }
  }

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: Partial<SiteSettings>) =>
        setForm((prev) => ({ ...prev, ...data })),
      )
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  const saveForm = async (next: SiteSettings, successMsg = 'Settings saved!') => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string; details?: unknown }
      throw new Error(data.error ?? 'Save failed')
    }
    toast.success(successMsg)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await saveForm(form)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof SiteSettings, val: string) =>
    setForm((p) => ({ ...p, [key]: val }))

  const faviconInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)

  const handleFaviconFile = async (file: File | undefined) => {
    if (!file) return
    const isIco = /\.ico$/i.test(file.name) ||
      file.type === 'image/x-icon' ||
      file.type === 'image/vnd.microsoft.icon'
    if (!file.type.startsWith('image/') && !isIco) {
      toast.error('Only image files (ICO, PNG, SVG) are allowed')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Favicon must be under 2MB')
      return
    }

    setUploadingFavicon(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'favicon')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'Upload failed')
        return
      }
      const next = { ...form, favicon: data.url }
      setForm(next)
      await saveForm(next, 'Favicon saved!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingFavicon(false)
    }
  }

  const removeFavicon = async () => {
    const next = { ...form, favicon: '' }
    setForm(next)
    try {
      await saveForm(next, 'Favicon removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Remove failed')
    }
  }

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

          {/* Favicon */}
          <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#1E1E1E]">
              <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-[#555]">Favicon</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-[#111] border border-[#252525] flex items-center justify-center overflow-hidden shrink-0">
                  {form.favicon ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={form.favicon} alt="Favicon preview" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-[#444]">No icon</span>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => faviconInputRef.current?.click()}
                      disabled={uploadingFavicon}
                      className="px-4 py-2 bg-[#111] border border-[#252525] rounded-lg text-xs text-white hover:border-[#C8FF47] transition-colors disabled:opacity-60"
                    >
                      {uploadingFavicon ? 'Uploading…' : form.favicon ? 'Replace' : 'Upload'}
                    </button>
                    {form.favicon && (
                      <button
                        type="button"
                        onClick={removeFavicon}
                        className="px-4 py-2 bg-[#111] border border-[#252525] rounded-lg text-xs text-white hover:border-red-500 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept=".ico,.png,.svg,image/*"
                    className="hidden"
                    onChange={(e) => {
                      handleFaviconFile(e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                  <p className="text-[11px] text-[#444]">ICO, PNG or SVG, up to 2MB. 32×32 or 64×64 recommended.</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#555] block mb-1.5">Favicon URL</label>
                <input
                  type="text"
                  placeholder="https://… or /favicon/uploads/…"
                  value={form.favicon}
                  onChange={(e) => set('favicon', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

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

          {/* MFA */}
          <MfaSection />

          {/* Backups */}
          <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#1E1E1E]">
              <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-[#555]">Backups</h2>
            </div>
            <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div>
                <p className="text-sm text-white">Manual snapshot</p>
                <p className="text-xs text-[#555] mt-1">
                  Runs daily at 03:17 UTC automatically. You can also trigger one now —
                  stored as <code className="font-mono text-[#C8FF47]">maze-backups/YYYY-MM-DD.json</code>.
                </p>
              </div>
              <button
                type="button"
                onClick={runBackup}
                disabled={backing}
                className="shrink-0 px-4 py-2 border border-[#252525] rounded-lg text-sm text-[#999] hover:text-white hover:border-[#444] transition-colors disabled:opacity-60"
              >
                {backing ? 'Backing up…' : 'Backup now'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
