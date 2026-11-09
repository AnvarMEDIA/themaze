'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark'

// The page background of each theme (--bg in app/globals.css), for the
// browser's own chrome: the address bar on a phone.
const THEME_COLOR: Record<Theme, string> = { dark: '#080808', light: '#F5F4F0' }

const REVEAL_MS = 400
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'

type DocumentWithTransitions = Document & {
  startViewTransition?: (update: () => void) => {
    ready: Promise<void>
    finished: Promise<void>
  }
}

function themeNow(): Theme {
  return document.documentElement.classList.contains('light') ? 'light' : 'dark'
}

function syncThemeColor(theme: Theme) {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
}

/**
 * Put the theme on <html> now, the way next-themes does, with every CSS
 * transition held for the swap: otherwise each element fades to its new
 * colour on its own clock (the header in 500ms, a link in 200ms) and the
 * page passes through a muddle of both themes.
 */
function paintTheme(next: Theme) {
  const root = document.documentElement
  const hold = document.createElement('style')
  hold.textContent = '*,*::before,*::after{-webkit-transition:none!important;transition:none!important}'
  document.head.appendChild(hold)
  root.classList.remove('light', 'dark')
  root.classList.add(next)
  root.style.colorScheme = next
  syncThemeColor(next)
  void window.getComputedStyle(root).color // restyle while transitions are off
  window.setTimeout(() => hold.remove(), 1)
}

const OPTIONS: Theme[] = ['light', 'dark']

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="w-3.5 h-3.5 shrink-0">
      <circle cx="8" cy="8" r="2.75" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 1.5v1.25M8 13.25v1.25M14.5 8h-1.25M2.75 8H1.5M12.6 3.4l-.88.88M4.28 11.72l-.88.88M12.6 12.6l-.88-.88M4.28 4.28l-.88-.88"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="w-3.5 h-3.5 shrink-0">
      <path
        d="M13.5 9.6A5.75 5.75 0 016.4 2.5a5.75 5.75 0 107.1 7.1z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Light / dark, as a two-part pill beside the language switch, built the
 * same way: the lit half slides. `labels` adds the words, for the mobile
 * menu, where there is room and a thumb to aim.
 *
 * Choosing the other theme grows it out of the button as a circle (a view
 * transition); with reduced motion it cross-fades instead, and a browser
 * without view transitions simply switches. next-themes keeps the choice.
 */
export function ThemeToggle({ labels = false, className }: { labels?: boolean; className?: string }) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const { setTheme } = useTheme()
  // Known only in the browser: until then no option claims to be pressed,
  // so the server HTML and the first client render agree.
  const [active, setActive] = useState<Theme | null>(null)

  useEffect(() => { setActive(themeNow()) }, [])

  // The metadata names one colour for the browser chrome; keep it on the
  // theme that is actually showing, on arrival and after each navigation.
  useEffect(() => { syncThemeColor(themeNow()) }, [pathname])

  const choose = (next: Theme, e: React.MouseEvent<HTMLButtonElement>) => {
    if (themeNow() === next) return
    const commit = () => {
      paintTheme(next)
      setTheme(next)
      setActive(next)
    }

    const doc = document as DocumentWithTransitions
    if (!doc.startViewTransition) { commit(); return }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const root = document.documentElement
    // The circle starts where the finger or pointer was.
    const r = e.currentTarget.getBoundingClientRect()
    const x = r.left + r.width / 2
    const y = r.top + r.height / 2

    if (!reduce) root.classList.add('theme-vt')
    const vt = doc.startViewTransition(commit)
    if (reduce) return

    vt.ready
      .then(() => {
        const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: REVEAL_MS, easing: EASE_OUT, pseudoElement: '::view-transition-new(root)' },
        )
      })
      .catch(() => { /* the swap still happened, just without the circle */ })
    vt.finished.finally(() => root.classList.remove('theme-vt'))
  }

  return (
    <div
      role="group"
      aria-label={t('theme')}
      className={cn(
        'theme-switch relative grid grid-cols-2 p-0.5 rounded-full border border-maze-border bg-maze-black/40',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="theme-switch-indicator absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-maze-lime"
      />
      {OPTIONS.map((option) => {
        const label = option === 'light' ? t('themeLight') : t('themeDark')
        return (
          <button
            key={option}
            type="button"
            data-theme-option={option}
            onClick={(e) => choose(option, e)}
            aria-pressed={active === null ? undefined : active === option}
            aria-label={labels ? undefined : label}
            title={labels ? undefined : label}
            className={cn(
              'relative z-10 inline-flex items-center justify-center gap-2 rounded-full active:scale-[0.95]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-lime',
              labels ? 'px-4 py-2.5 label-sm' : 'w-8 py-1.5',
            )}
          >
            {option === 'light' ? <SunIcon /> : <MoonIcon />}
            {labels && <span>{label}</span>}
          </button>
        )
      })}
    </div>
  )
}
