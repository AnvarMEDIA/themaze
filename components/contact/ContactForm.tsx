'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import toast from 'react-hot-toast'
import { LiquidButton } from '@/components/ui/LiquidButton'

const budgets = [
  'Under $2,000',
  '$2,000 – $5,000',
  '$5,000 – $15,000',
  '$15,000 – $50,000',
  '$50,000+',
]

export function ContactForm() {
  const t       = useTranslations('contactPage.form')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', company: '', service: '', budget: '', message: '',
  })

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    toast.success(t('success'), { duration: 5000 })
    setForm({ name: '', email: '', company: '', service: '', budget: '', message: '' })
    setLoading(false)
  }

  const inputClass =
    'w-full bg-transparent border border-maze-border rounded-lg px-4 py-3.5 body-lg text-maze-cream placeholder:text-maze-muted focus:outline-none focus:border-maze-lime transition-colors duration-200'

  // Service options translated
  const tServices = useTranslations('services')
  const serviceItems = tServices.raw('items') as { title: string }[]
  const serviceOptions = serviceItems.map((s) => s.title)

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label-sm text-maze-muted block mb-2">{t('name')} *</label>
          <input
            type="text"
            required
            placeholder={t('namePlaceholder')}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="label-sm text-maze-muted block mb-2">{t('email')} *</label>
          <input
            type="email"
            required
            placeholder={t('emailPlaceholder')}
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Service */}
      <div>
        <label className="label-sm text-maze-muted block mb-2">{t('service')} *</label>
        <select
          required
          value={form.service}
          onChange={(e) => set('service', e.target.value)}
          className={inputClass + ' appearance-none bg-maze-dark'}
        >
          <option value="" disabled>{t('servicePlaceholder')}</option>
          {serviceOptions.map((s) => (
            <option key={s} value={s} className="bg-maze-dark">{s}</option>
          ))}
        </select>
      </div>

      {/* Budget */}
      <div>
        <label className="label-sm text-maze-muted block mb-3">Budget</label>
        <div className="flex flex-wrap gap-2">
          {budgets.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => set('budget', b)}
              className={[
                'relative overflow-hidden rounded-full label-sm px-4 py-2 transition-all duration-200',
                form.budget === b
                  ? 'glass-lime'
                  : 'glass-clear text-maze-muted hover:text-maze-cream',
              ].join(' ')}
            >
              {form.budget === b && (
                <span aria-hidden className="absolute inset-0 rounded-[inherit] pointer-events-none"
                  style={{ background: 'linear-gradient(148deg,rgba(255,255,255,0.22) 0%,rgba(255,255,255,0.06) 20%,transparent 50%)' }} />
              )}
              <span className="relative z-10">{b}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="label-sm text-maze-muted block mb-2">{t('message')} *</label>
        <textarea
          required
          rows={5}
          placeholder={t('messagePlaceholder')}
          value={form.message}
          onChange={(e) => set('message', e.target.value)}
          className={inputClass + ' resize-none'}
        />
      </div>

      {/* Submit */}
      <LiquidButton
        type="submit"
        variant="lime"
        size="lg"
        disabled={loading}
        className="w-full justify-center"
      >
        {loading ? t('sending') : `${t('send')} ↗`}
      </LiquidButton>
    </form>
  )
}
