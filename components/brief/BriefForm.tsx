'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import toast from 'react-hot-toast'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import flags from 'react-phone-number-input/flags'

/* ── SVG previews for style cards ──────────────────────────────────────── */

const STYLE_SVGS: Record<string, React.ReactNode> = {
  bold: (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="w-full h-full">
      <rect x="8" y="14" width="64" height="16" rx="2" fill="currentColor" />
      <rect x="8" y="36" width="44" height="16" rx="2" fill="currentColor" />
      <rect x="8" y="58" width="24" height="10" rx="2" fill="currentColor" opacity="0.45" />
    </svg>
  ),
  minimal: (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="w-full h-full">
      <line x1="8" y1="40" x2="72" y2="40" stroke="currentColor" strokeWidth="1" />
      <circle cx="40" cy="40" r="3.5" fill="currentColor" />
      <line x1="8" y1="52" x2="48" y2="52" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
    </svg>
  ),
  playful: (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="w-full h-full">
      <circle cx="24" cy="34" r="16" fill="currentColor" opacity="0.25" />
      <circle cx="50" cy="50" r="16" fill="currentColor" opacity="0.45" />
      <circle cx="58" cy="28" r="10" fill="currentColor" opacity="0.7" />
    </svg>
  ),
  classic: (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="w-full h-full">
      <line x1="40" y1="10" x2="40" y2="70" stroke="currentColor" strokeWidth="0.75" />
      <line x1="10" y1="40" x2="70" y2="40" stroke="currentColor" strokeWidth="0.75" />
      <rect x="24" y="24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="40" cy="40" r="9" fill="none" stroke="currentColor" strokeWidth="0.75" />
    </svg>
  ),
  tech: (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="w-full h-full">
      <rect x="8"  y="8"  width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="31" y="8"  width="18" height="18" fill="currentColor" opacity="0.8" />
      <rect x="54" y="8"  width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="8"  y="31" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <rect x="54" y="31" width="18" height="18" fill="currentColor" opacity="0.3" />
      <line x1="8" y1="72" x2="72" y2="8" stroke="currentColor" strokeWidth="0.75" opacity="0.35" />
    </svg>
  ),
  luxury: (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="w-full h-full">
      <line x1="40" y1="8"  x2="40" y2="72" stroke="currentColor" strokeWidth="0.5" />
      <line x1="16" y1="28" x2="64" y2="28" stroke="currentColor" strokeWidth="0.5" />
      <line x1="16" y1="52" x2="64" y2="52" stroke="currentColor" strokeWidth="0.5" />
      <rect x="33" y="33" width="14" height="14"
        transform="rotate(45 40 40)" fill="currentColor" opacity="0.85" />
    </svg>
  ),
  organic: (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="w-full h-full">
      <path
        d="M18,42 C18,22 34,12 52,20 C66,26 70,44 56,58 C44,70 18,62 18,42Z"
        fill="currentColor" opacity="0.3"
      />
      <circle cx="38" cy="38" r="9" fill="currentColor" opacity="0.7" />
    </svg>
  ),
  abstract: (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="w-full h-full">
      <circle cx="30" cy="36" r="18" fill="currentColor" opacity="0.25" />
      <circle cx="52" cy="46" r="18" fill="currentColor" opacity="0.25" />
      <polygon
        points="40,12 68,62 12,62"
        fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.7"
      />
    </svg>
  ),
}

/* ── Types ──────────────────────────────────────────────────────────────── */

interface FormData {
  name: string; email: string; phone: string; company: string; website: string
  services: string[]; description: string; goals: string; audience: string; competitors: string
  styles: string[]; colors: string[]; refLinks: string
  timeline: string; budget: string; source: string; notes: string
  hp: string
}

interface StyleCard   { id: string; label: string; desc: string }
interface ColorCard   { id: string; label: string; desc: string; swatches: string[] }
interface ServiceItem { id: string; label: string }

/* ── Shared class strings ─────────────────────────────────────────────── */

const INPUT_CLASS =
  'w-full bg-transparent border border-maze-border rounded-lg px-4 py-3.5 body-lg ' +
  'text-maze-cream placeholder:text-maze-muted focus:outline-none focus:border-maze-lime transition-colors duration-200'

const chipClass = (active: boolean) =>
  `label-sm px-4 py-2 border rounded-full transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-lime cursor-pointer ${
    active
      ? 'border-maze-lime text-maze-ink bg-maze-lime'
      : 'border-maze-border text-maze-muted hover:border-maze-cream hover:text-maze-cream'
  }`

const Check = () => (
  <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-maze-lime flex items-center justify-center">
    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
      <path d="M1 3L3 5L7 1" stroke="#080808" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </span>
)

/* ── Component ──────────────────────────────────────────────────────────── */

export function BriefForm() {
  const t            = useTranslations('brief')
  const steps        = t.raw('steps')        as string[]
  const timelines    = t.raw('timelines')    as string[]
  const budgets      = t.raw('budgets')      as string[]
  const styleCards   = t.raw('styleCards')   as StyleCard[]
  const colorCards   = t.raw('colorCards')   as ColorCard[]
  const serviceItems = t.raw('services')     as ServiceItem[]

  const [step,      setStep]      = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const mountedAt = useRef(Date.now())

  const [form, setForm] = useState<FormData>({
    name: '', email: '', phone: '', company: '', website: '',
    services: [], description: '', goals: '', audience: '', competitors: '',
    styles: [], colors: [], refLinks: '',
    timeline: '', budget: '', source: '', notes: '',
    hp: '',
  })

  const set = (key: keyof FormData, value: string) =>
    setForm((p) => ({ ...p, [key]: value }))

  const toggle = (key: 'services' | 'styles' | 'colors', value: string) =>
    setForm((p) => {
      const arr = p[key] as string[]
      return { ...p, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] }
    })

  const phoneInvalid = form.phone.length > 0 && !isValidPhoneNumber(form.phone)

  const canAdvance = (s: number): boolean => {
    if (s === 1) return form.name.trim().length > 0 && /\S+@\S+\.\S+/.test(form.email) && !phoneInvalid
    if (s === 2) return form.description.trim().length > 0
    return true
  }

  const handleNext = () => {
    if (!canAdvance(step)) {
      if (step === 1) {
        if (!form.name.trim()) toast.error(t('validation.nameRequired'))
        else if (!/\S+@\S+\.\S+/.test(form.email)) toast.error(t('validation.emailRequired'))
        else if (phoneInvalid) toast.error(t('validation.phoneInvalid'))
      } else if (step === 2) {
        toast.error(t('validation.descRequired'))
      }
      return
    }
    setStep((s) => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBack = () => {
    setStep((s) => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phoneInvalid) { toast.error(t('validation.phoneInvalid')); return }
    setLoading(true)
    try {
      const elapsed = Date.now() - mountedAt.current
      if (elapsed < 2000) {
        setSubmitted(true)
        return
      }
      const res = await fetch('/api/brief', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      if (res.status === 429) { toast.error(t('tooMany')); return }
      if (!res.ok) throw new Error()
      setSubmitted(true)
    } catch {
      toast.error(t('error'))
    } finally {
      setLoading(false)
    }
  }

  /* ── Success screen ───────────────────────────────────────────────────── */

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="label-sm text-maze-lime mb-6">{t('success.label')}</p>
        <h2 className="display-sm text-maze-cream mb-4">{t('success.heading')}</h2>
        <p className="body-lg text-maze-muted max-w-sm mb-10">{t('success.body')}</p>
        <Link
          href="/"
          className="label-sm px-8 py-4 bg-maze-lime text-maze-ink font-bold rounded-full hover:bg-maze-paper transition-colors duration-200"
        >
          {t('success.cta')}
        </Link>
      </div>
    )
  }

  /* ── Render ───────────────────────────────────────────────────────────── */

  const headings = [t('step1.heading'), t('step2.heading'), t('step3.heading'), t('step4.heading')]
  const subs     = [t('step1.sub'),     t('step2.sub'),     t('step3.sub'),     t('step4.sub')]

  const navButtons = (isSubmit = false) => (
    <div className="flex gap-3 mt-10 pt-8 border-t border-maze-border">
      {step > 1 && (
        <button
          type="button"
          onClick={handleBack}
          className="label-sm px-6 py-3.5 border border-maze-border text-maze-muted rounded-full hover:border-maze-cream hover:text-maze-cream transition-colors duration-200"
        >
          ← {t('nav.back')}
        </button>
      )}
      <button
        type={isSubmit ? 'submit' : 'button'}
        onClick={isSubmit ? undefined : handleNext}
        disabled={loading}
        className="flex-1 py-4 bg-maze-lime text-maze-ink font-bold rounded-full hover:bg-maze-paper transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed label-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-cream"
      >
        {isSubmit
          ? (loading ? t('nav.submitting') : t('nav.submit'))
          : t('nav.next')}
      </button>
    </div>
  )

  return (
    <div>
      {/* Progress */}
      <div className="mb-10">
        <div className="flex items-center gap-0">
          {steps.map((label, i) => {
            const n       = i + 1
            const done    = n < step
            const current = n === step
            return (
              <div key={n} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center label-sm transition-all duration-200 ${
                      done    ? 'bg-maze-lime text-maze-ink'
                      : current ? 'border-2 border-maze-lime text-maze-lime'
                      : 'border border-maze-border text-maze-muted'
                    }`}
                  >
                    {done ? '✓' : n}
                  </div>
                  <span className={`text-[10px] uppercase tracking-widest hidden sm:block ${current ? 'text-maze-cream' : 'text-maze-muted'}`}>
                    {label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-px flex-1 mx-2 transition-colors duration-200 ${done ? 'bg-maze-lime' : 'bg-maze-border'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step heading */}
      <div className="mb-8">
        <h2 className="heading-lg text-maze-cream mb-1">{headings[step - 1]}</h2>
        <p className="body-lg text-maze-muted">{subs[step - 1]}</p>
      </div>

      {/* ── Step 1 ── */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bf-name" className="label-sm text-maze-muted block mb-2">{t('fields.name')} *</label>
              <input
                id="bf-name" type="text" required autoComplete="name"
                placeholder={t('fields.namePlaceholder')}
                value={form.name} onChange={(e) => set('name', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="bf-email" className="label-sm text-maze-muted block mb-2">{t('fields.email')} *</label>
              <input
                id="bf-email" type="email" required autoComplete="email"
                placeholder={t('fields.emailPlaceholder')}
                value={form.email} onChange={(e) => set('email', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bf-phone" className="label-sm text-maze-muted block mb-2">{t('fields.phone')}</label>
              <PhoneInput
                id="bf-phone" international defaultCountry="UZ" flags={flags}
                value={form.phone} onChange={(v) => set('phone', v ?? '')}
                placeholder="+998 90 123 45 67"
                className={`maze-phone ${phoneInvalid ? 'maze-phone--invalid' : ''}`}
                numberInputProps={{ autoComplete: 'tel' }}
                aria-invalid={phoneInvalid || undefined}
              />
              {phoneInvalid && (
                <p className="mt-1.5 text-xs text-red-400">{t('validation.phoneInvalid')}</p>
              )}
            </div>
            <div>
              <label htmlFor="bf-company" className="label-sm text-maze-muted block mb-2">{t('fields.company')}</label>
              <input
                id="bf-company" type="text" autoComplete="organization"
                placeholder={t('fields.companyPlaceholder')}
                value={form.company} onChange={(e) => set('company', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div>
            <label htmlFor="bf-website" className="label-sm text-maze-muted block mb-2">{t('fields.website')}</label>
            <input
              id="bf-website" type="url" autoComplete="url"
              placeholder={t('fields.websitePlaceholder')}
              value={form.website} onChange={(e) => set('website', e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          {navButtons()}
        </div>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <div className="space-y-7">
          <div>
            <p className="label-sm text-maze-muted mb-1">{t('fields.services')}</p>
            <p className="text-xs text-maze-muted opacity-60 mb-3">{t('fields.servicesHint')}</p>
            <div className="flex flex-wrap gap-2">
              {serviceItems.map((s) => (
                <button
                  key={s.id} type="button"
                  aria-pressed={form.services.includes(s.id)}
                  onClick={() => toggle('services', s.id)}
                  className={chipClass(form.services.includes(s.id))}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="bf-description" className="label-sm text-maze-muted block mb-2">{t('fields.description')} *</label>
            <textarea
              id="bf-description" required rows={5}
              placeholder={t('fields.descriptionPlaceholder')}
              value={form.description} onChange={(e) => set('description', e.target.value)}
              className={INPUT_CLASS + ' resize-none'}
            />
          </div>

          <div>
            <label htmlFor="bf-goals" className="label-sm text-maze-muted block mb-2">{t('fields.goals')}</label>
            <textarea
              id="bf-goals" rows={3}
              placeholder={t('fields.goalsPlaceholder')}
              value={form.goals} onChange={(e) => set('goals', e.target.value)}
              className={INPUT_CLASS + ' resize-none'}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bf-audience" className="label-sm text-maze-muted block mb-2">{t('fields.audience')}</label>
              <textarea
                id="bf-audience" rows={3}
                placeholder={t('fields.audiencePlaceholder')}
                value={form.audience} onChange={(e) => set('audience', e.target.value)}
                className={INPUT_CLASS + ' resize-none'}
              />
            </div>
            <div>
              <label htmlFor="bf-competitors" className="label-sm text-maze-muted block mb-2">{t('fields.competitors')}</label>
              <textarea
                id="bf-competitors" rows={3}
                placeholder={t('fields.competitorsPlaceholder')}
                value={form.competitors} onChange={(e) => set('competitors', e.target.value)}
                className={INPUT_CLASS + ' resize-none'}
              />
            </div>
          </div>

          {navButtons()}
        </div>
      )}

      {/* ── Step 3 ── */}
      {step === 3 && (
        <div className="space-y-10">
          <div>
            <p className="label-sm text-maze-muted mb-1">{t('fields.styles')}</p>
            <p className="text-xs text-maze-muted opacity-60 mb-4">{t('fields.stylesHint')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {styleCards.map((card) => {
                const active = form.styles.includes(card.id)
                return (
                  <button
                    key={card.id} type="button"
                    aria-pressed={active}
                    onClick={() => toggle('styles', card.id)}
                    className={`group relative rounded-xl border p-4 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-lime ${
                      active
                        ? 'border-maze-lime bg-maze-lime/5'
                        : 'border-maze-border hover:border-maze-cream/50'
                    }`}
                  >
                    <div className={`w-full aspect-square mb-3 transition-colors duration-150 ${active ? 'text-maze-lime' : 'text-maze-muted group-hover:text-maze-cream'}`}>
                      {STYLE_SVGS[card.id]}
                    </div>
                    <p className={`label-sm mb-0.5 transition-colors duration-150 ${active ? 'text-maze-lime' : 'text-maze-cream'}`}>
                      {card.label}
                    </p>
                    <p className="text-[11px] text-maze-muted leading-tight">{card.desc}</p>
                    {active && <Check />}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="label-sm text-maze-muted mb-1">{t('fields.colors')}</p>
            <p className="text-xs text-maze-muted opacity-60 mb-4">{t('fields.colorsHint')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {colorCards.map((card) => {
                const active = form.colors.includes(card.id)
                return (
                  <button
                    key={card.id} type="button"
                    aria-pressed={active}
                    onClick={() => toggle('colors', card.id)}
                    className={`group relative rounded-xl border p-4 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-lime ${
                      active
                        ? 'border-maze-lime bg-maze-lime/5'
                        : 'border-maze-border hover:border-maze-cream/50'
                    }`}
                  >
                    <div className="flex gap-1.5 mb-3">
                      {card.swatches.map((hex, i) => (
                        <div
                          key={i}
                          className="h-7 flex-1 rounded-md border border-white/10"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                    <p className={`label-sm mb-0.5 transition-colors duration-150 ${active ? 'text-maze-lime' : 'text-maze-cream'}`}>
                      {card.label}
                    </p>
                    <p className="text-[11px] text-maze-muted">{card.desc}</p>
                    {active && <Check />}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label htmlFor="bf-reflinks" className="label-sm text-maze-muted block mb-2">{t('fields.refLinks')}</label>
            <textarea
              id="bf-reflinks" rows={3}
              placeholder={t('fields.refLinksPlaceholder')}
              value={form.refLinks} onChange={(e) => set('refLinks', e.target.value)}
              className={INPUT_CLASS + ' resize-none'}
            />
          </div>

          {navButtons()}
        </div>
      )}

      {/* ── Step 4 ── */}
      {step === 4 && (
        <form onSubmit={handleSubmit} noValidate>
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

          <div className="space-y-7">
            <div>
              <p id="timeline-label" className="label-sm text-maze-muted block mb-3">{t('fields.timeline')}</p>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby="timeline-label">
                {timelines.map((tl) => (
                  <button
                    key={tl} type="button" aria-pressed={form.timeline === tl}
                    onClick={() => set('timeline', tl)}
                    className={chipClass(form.timeline === tl)}
                  >
                    {tl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p id="budget-label" className="label-sm text-maze-muted block mb-3">{t('fields.budget')}</p>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby="budget-label">
                {budgets.map((b) => (
                  <button
                    key={b} type="button" aria-pressed={form.budget === b}
                    onClick={() => set('budget', b)}
                    className={chipClass(form.budget === b)}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="bf-source" className="label-sm text-maze-muted block mb-2">{t('fields.source')}</label>
              <input
                id="bf-source" type="text"
                placeholder={t('fields.sourcePlaceholder')}
                value={form.source} onChange={(e) => set('source', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="bf-notes" className="label-sm text-maze-muted block mb-2">{t('fields.notes')}</label>
              <textarea
                id="bf-notes" rows={4}
                placeholder={t('fields.notesPlaceholder')}
                value={form.notes} onChange={(e) => set('notes', e.target.value)}
                className={INPUT_CLASS + ' resize-none'}
              />
            </div>

            {navButtons(true)}
          </div>
        </form>
      )}
    </div>
  )
}
