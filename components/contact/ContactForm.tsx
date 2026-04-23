'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import toast from 'react-hot-toast'


export function ContactForm() {
  const t       = useTranslations('contactPage.form')
  const budgets = t.raw('budgets') as string[]
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', company: '', service: '', budget: '', message: '', website: '',
  })
  const mountedAt = useRef<number>(Date.now())

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Client-side timing check: humans take >2s to fill the form.
      // A submission in under 2s is almost certainly a bot.
      const elapsed = Date.now() - mountedAt.current
      if (elapsed < 2000) {
        toast.success(t('success'), { duration: 5000 })
        setForm({ name: '', email: '', company: '', service: '', budget: '', message: '', website: '' })
        return
      }

      const res = await fetch('/api/inquiries', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      if (res.status === 429) {
        toast.error(t('tooMany'))
        return
      }
      if (!res.ok) throw new Error()
      toast.success(t('success'), { duration: 5000 })
      setForm({ name: '', email: '', company: '', service: '', budget: '', message: '', website: '' })
    } catch {
      toast.error(t('error'))
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full bg-transparent border border-maze-border rounded-lg px-4 py-3.5 body-lg text-maze-cream placeholder:text-maze-muted focus:outline-none focus:border-maze-lime transition-colors duration-200'

  const tServices = useTranslations('services')
  const serviceItems = tServices.raw('items') as { title: string }[]
  const serviceOptions = serviceItems.map((s) => s.title)

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Honeypot: hidden from real users, irresistible to bots */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}
      >
        <label>
          Website (leave empty)
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => set('website', e.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="cf-name" className="label-sm text-maze-muted block mb-2">{t('name')} *</label>
          <input
            id="cf-name"
            type="text"
            required
            autoComplete="name"
            placeholder={t('namePlaceholder')}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="cf-email" className="label-sm text-maze-muted block mb-2">{t('email')} *</label>
          <input
            id="cf-email"
            type="email"
            required
            autoComplete="email"
            placeholder={t('emailPlaceholder')}
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="cf-service" className="label-sm text-maze-muted block mb-2">{t('service')} *</label>
        <select
          id="cf-service"
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

      <div>
        <span id="cf-budget-label" className="label-sm text-maze-muted block mb-3">{t('budget')}</span>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="cf-budget-label">
          {budgets.map((b) => {
            const active = form.budget === b
            return (
              <button
                key={b}
                type="button"
                aria-pressed={active}
                onClick={() => set('budget', b)}
                className={`label-sm px-4 py-2 border rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-lime ${
                  active
                    ? 'border-maze-lime text-maze-ink bg-maze-lime'
                    : 'border-maze-border text-maze-muted hover:border-maze-cream hover:text-maze-cream'
                }`}
              >
                {b}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label htmlFor="cf-message" className="label-sm text-maze-muted block mb-2">{t('message')} *</label>
        <textarea
          id="cf-message"
          required
          rows={5}
          placeholder={t('messagePlaceholder')}
          value={form.message}
          onChange={(e) => set('message', e.target.value)}
          className={inputClass + ' resize-none'}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-maze-lime text-maze-ink font-bold rounded-full hover:bg-maze-paper transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed label-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-cream"
      >
        {loading ? t('sending') : `${t('send')} ↗`}
      </button>
    </form>
  )
}
