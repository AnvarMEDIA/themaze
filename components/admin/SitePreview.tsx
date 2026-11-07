'use client'

import { forwardRef, type CSSProperties, type ReactNode } from 'react'

/**
 * Shared by the admin pages that show a homepage block while it is edited
 * (World map, Numbers): a box in the site's own colours, and the language
 * and theme switches above it.
 */

export type PreviewLang  = 'ru' | 'en'
export type PreviewTheme = 'dark' | 'light'

// The site's palette comes from the theme classes in app/globals.css. The
// admin layout sets its own lime on `.dark`, so the site's white accent is
// put back here.
const SITE_DARK_ACCENT = {
  '--lime':         '255 255 255',
  '--color-lime':   '#FFFFFF',
  '--accent-hover': '214 214 214',
} as CSSProperties

export const SitePreview = forwardRef<HTMLDivElement, {
  theme:      PreviewTheme
  className?: string
  children:   ReactNode
}>(function SitePreview({ theme, className = '', children }, ref) {
  return (
    <div
      ref={ref}
      className={`${theme} ${className}`}
      style={{ ...(theme === 'dark' ? SITE_DARK_ACCENT : {}), background: 'rgb(var(--bg))', color: 'rgb(var(--text))' }}
    >
      {children}
    </div>
  )
})

export function Segmented<T extends string>({
  value, onChange, options, label,
}: {
  value:    T
  onChange: (v: T) => void
  options:  { value: T; label: string }[]
  label:    string
}) {
  return (
    <div role="group" aria-label={label} className="flex p-0.5 rounded-lg bg-[#111] border border-[#252525]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors active:scale-[0.97] ${
            value === o.value ? 'bg-[#C8FF47]/10 text-[#C8FF47]' : 'text-[#666] hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function PreviewSwitches({
  lang, onLang, theme, onTheme,
}: {
  lang:    PreviewLang
  onLang:  (v: PreviewLang) => void
  theme:   PreviewTheme
  onTheme: (v: PreviewTheme) => void
}) {
  return (
    <>
      <Segmented
        value={lang}
        onChange={onLang}
        options={[{ value: 'ru', label: 'RU' }, { value: 'en', label: 'EN' }]}
        label="Язык превью"
      />
      <Segmented
        value={theme}
        onChange={onTheme}
        options={[{ value: 'dark', label: 'Тёмная' }, { value: 'light', label: 'Светлая' }]}
        label="Тема превью"
      />
    </>
  )
}
