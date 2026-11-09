'use client'

import { useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion, useReducedMotion } from 'framer-motion'
import toast from 'react-hot-toast'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import flags from 'react-phone-number-input/flags'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { FormNeedsScript } from '@/components/ui/FormNeedsScript'

const EASE_OUT = [0.23, 1, 0.32, 1] as const

const INPUT_CLASS =
  'w-full bg-transparent border border-maze-border rounded-lg px-4 py-3.5 body-lg ' +
  'text-maze-cream placeholder:text-maze-muted focus:outline-none focus:border-maze-lime transition-colors duration-200'

const INVALID = 'border-red-400/70'
const LABEL = 'label-sm text-maze-muted block mb-2'
const ABOUT_MAX = 3000

interface Fields {
  name: string; phone: string; telegram: string; email: string
  city: string; portfolio: string; about: string; hp: string
}

type FieldKey = 'name' | 'phone' | 'email' | 'portfolio' | 'about'

/** The same rule the server applies: a scheme is supplied, a host needs a TLD. */
function portfolioOk(raw: string): boolean {
  const v = raw.trim()
  if (!v) return false
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
    return (u.protocol === 'https:' || u.protocol === 'http:') && /\.(?:[a-z]{2,}|xn--[a-z0-9-]+)$/i.test(u.hostname)
  } catch {
    return false
  }
}

export function InternshipForm() {
  const t      = useTranslations('internship')
  const locale = useLocale()
  const reduce = useReducedMotion()
  const mountedAt = useRef(Date.now())

  const [form, setForm] = useState<Fields>({
    name: '', phone: '', telegram: '', email: '', city: '', portfolio: '', about: '', hp: '',
  })
  const [tried,     setTried]     = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const set = (key: keyof Fields, value: string) => setForm((p) => ({ ...p, [key]: value }))

  // Required fields complain only after a first attempt; a malformed phone or
  // email says so as soon as something is typed, as on the brief.
  const errors: Partial<Record<FieldKey, string>> = {}
  if (!form.name.trim()) errors.name = t('validation.nameRequired')
  if (!form.phone) errors.phone = t('validation.phoneRequired')
  else if (!isValidPhoneNumber(form.phone)) errors.phone = t('validation.phoneInvalid')
  if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = t('validation.emailInvalid')
  if (!form.portfolio.trim()) errors.portfolio = t('validation.portfolioRequired')
  else if (!portfolioOk(form.portfolio)) errors.portfolio = t('validation.portfolioInvalid')
  if (!form.about.trim()) errors.about = t('validation.aboutRequired')

  const shown = (key: FieldKey): string | undefined => {
    if (tried) return errors[key]
    if (key === 'phone' && form.phone) return errors.phone
    if (key === 'email') return errors.email
    return undefined
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTried(true)
    const first = (['name', 'phone', 'email', 'portfolio', 'about'] as FieldKey[]).find((k) => errors[k])
    if (first) {
      document.getElementById(`if-${first}`)?.focus()
      return
    }

    setLoading(true)
    try {
      // Faster than any person can fill this in: a script. Shown the same
      // thank-you, so it learns nothing.
      if (Date.now() - mountedAt.current < 2000) {
        setSubmitted(true)
        return
      }
      const res = await fetch('/api/internship', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, locale: locale === 'ru' ? 'ru' : 'en' }),
      })
      if (res.status === 429) { toast.error(t('tooMany')); return }
      if (res.status === 409) { toast.error(t('closedError')); return }
      if (!res.ok) throw new Error()
      setSubmitted(true)
    } catch {
      toast.error(t('error'))
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0.2 : 0.4, ease: EASE_OUT }}
        className="border border-maze-border rounded-2xl px-6 py-16 sm:px-10 text-center"
        role="status"
      >
        <p className="label-sm text-maze-lime mb-5">{t('success.label')}</p>
        <h3 className="heading-lg text-maze-cream mb-4">{t('success.heading')}</h3>
        <p className="body-lg text-maze-muted max-w-sm mx-auto mb-10">{t('success.body')}</p>
        <Link
          href="/portfolio"
          className="label-sm inline-flex px-8 py-4 bg-maze-lime text-maze-ink font-bold rounded-full transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-maze-paper"
        >
          {t('success.cta')}
        </Link>
      </motion.div>
    )
  }

  const err = (key: FieldKey) => {
    const msg = shown(key)
    return msg ? <p id={`if-${key}-error`} className="mt-1.5 text-xs text-red-400">{msg}</p> : null
  }
  const describedBy = (key: FieldKey, extra?: string) =>
    [shown(key) ? `if-${key}-error` : '', extra ?? ''].filter(Boolean).join(' ') || undefined

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Honeypot */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}
      >
        <label>
          Leave empty
          <input
            type="text" tabIndex={-1} autoComplete="off"
            value={form.hp} onChange={(e) => set('hp', e.target.value)}
          />
        </label>
      </div>

      <FormNeedsScript />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
        <div>
          <label htmlFor="if-name" className={LABEL}>{t('form.name')} *</label>
          <input
            id="if-name" type="text" autoComplete="name" maxLength={100}
            placeholder={t('form.namePlaceholder')}
            value={form.name} onChange={(e) => set('name', e.target.value)}
            className={cn(INPUT_CLASS, shown('name') && INVALID)}
            aria-invalid={shown('name') ? true : undefined}
            aria-describedby={describedBy('name')}
          />
          {err('name')}
        </div>
        <div>
          <label htmlFor="if-phone" className={LABEL}>{t('form.phone')} *</label>
          <PhoneInput
            id="if-phone" international defaultCountry="UZ" flags={flags}
            value={form.phone} onChange={(v) => set('phone', v ?? '')}
            placeholder="+998 90 123 45 67"
            className={cn('maze-phone', shown('phone') && 'maze-phone--invalid')}
            numberInputProps={{ autoComplete: 'tel' }}
            aria-invalid={shown('phone') ? true : undefined}
            aria-describedby={describedBy('phone')}
          />
          {err('phone')}
        </div>

        <div>
          <label htmlFor="if-telegram" className={LABEL}>{t('form.telegram')}</label>
          <input
            id="if-telegram" type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={64}
            placeholder={t('form.telegramPlaceholder')}
            value={form.telegram} onChange={(e) => set('telegram', e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="if-email" className={LABEL}>{t('form.email')}</label>
          <input
            id="if-email" type="email" autoComplete="email" maxLength={254}
            placeholder={t('form.emailPlaceholder')}
            value={form.email} onChange={(e) => set('email', e.target.value)}
            className={cn(INPUT_CLASS, shown('email') && INVALID)}
            aria-invalid={shown('email') ? true : undefined}
            aria-describedby={describedBy('email')}
          />
          {err('email')}
        </div>

        <div>
          <label htmlFor="if-city" className={LABEL}>{t('form.city')}</label>
          <input
            id="if-city" type="text" autoComplete="address-level2" maxLength={100}
            placeholder={t('form.cityPlaceholder')}
            value={form.city} onChange={(e) => set('city', e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="if-portfolio" className={LABEL}>{t('form.portfolio')} *</label>
          <input
            id="if-portfolio" type="url" inputMode="url" autoComplete="url" autoCapitalize="none" spellCheck={false}
            maxLength={500}
            placeholder={t('form.portfolioPlaceholder')}
            value={form.portfolio} onChange={(e) => set('portfolio', e.target.value)}
            className={cn(INPUT_CLASS, shown('portfolio') && INVALID)}
            aria-invalid={shown('portfolio') ? true : undefined}
            aria-describedby={describedBy('portfolio', 'if-portfolio-hint')}
          />
          {err('portfolio')}
        </div>
      </div>

      <p id="if-portfolio-hint" className="text-sm text-maze-muted -mt-1">{t('form.portfolioHint')}</p>

      <div>
        <label htmlFor="if-about" className={LABEL}>{t('form.about')} *</label>
        <textarea
          id="if-about" rows={6} maxLength={ABOUT_MAX}
          placeholder={t('form.aboutPlaceholder')}
          value={form.about} onChange={(e) => set('about', e.target.value)}
          className={cn(INPUT_CLASS, 'resize-none', shown('about') && INVALID)}
          aria-invalid={shown('about') ? true : undefined}
          aria-describedby={describedBy('about')}
        />
        <div className="flex items-start justify-between gap-4">
          {err('about') ?? <span />}
          {/* Only near the limit, where it starts to matter. */}
          {form.about.length > ABOUT_MAX * 0.8 && (
            <p className="mt-1.5 text-xs text-maze-muted tabular-nums">{form.about.length} / {ABOUT_MAX}</p>
          )}
        </div>
      </div>

      <div className="pt-3 space-y-4">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-maze-lime text-maze-ink font-bold rounded-full label-sm transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-maze-paper disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-cream"
        >
          {loading ? t('form.submitting') : t('form.submit')}
        </button>
        <p className="text-sm text-maze-muted text-center">
          {t.rich('form.consent', {
            link: (chunks) => (
              <Link href="/legal/privacy" className="underline underline-offset-4 decoration-maze-border hover:text-maze-cream transition-colors duration-200">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </form>
  )
}
