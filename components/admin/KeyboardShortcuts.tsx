'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { tinykeys } from 'tinykeys'

interface Shortcut {
  keys:        string | string[]
  label:       string
  description: string
  action:     (ctx: { router: ReturnType<typeof useRouter>; setHelpOpen: (v: boolean) => void }) => void
}

const SHORTCUTS: Shortcut[] = [
  { keys: '/',                label: '/',        description: 'Focus search',         action: () => focusSearch() },
  { keys: 'g p',              label: 'g then p', description: 'Go to Projects',       action: ({ router }) => router.push('/admin/projects') },
  { keys: 'g i',              label: 'g then i', description: 'Go to Insights',       action: ({ router }) => router.push('/admin/insights') },
  { keys: 'g c',              label: 'g then c', description: 'Go to Inquiries',      action: ({ router }) => router.push('/admin/inquiries') },
  { keys: 'g t',              label: 'g then t', description: 'Go to Team',           action: ({ router }) => router.push('/admin/team') },
  { keys: 'g r',              label: 'g then r', description: 'Go to Testimonials',   action: ({ router }) => router.push('/admin/testimonials') },
  { keys: 'g a',              label: 'g then a', description: 'Go to Partners',       action: ({ router }) => router.push('/admin/partners') },
  { keys: 'g s',              label: 'g then s', description: 'Go to Settings',       action: ({ router }) => router.push('/admin/settings') },
  { keys: 'g h',              label: 'g then h', description: 'Go to Dashboard',      action: ({ router }) => router.push('/admin') },
  { keys: 'n p',              label: 'n then p', description: 'New project',          action: ({ router }) => router.push('/admin/projects/new') },
  { keys: 'n i',              label: 'n then i', description: 'New insight post',     action: ({ router }) => router.push('/admin/insights/new') },
  { keys: '?',                label: '?',        description: 'Show keyboard help',   action: ({ setHelpOpen }) => setHelpOpen(true) },
  { keys: 'Shift+?',          label: 'Shift+?',  description: 'Show keyboard help',   action: ({ setHelpOpen }) => setHelpOpen(true) },
]

function focusSearch() {
  // Prefer the in-page search input; fall back to any type="search".
  const selectors = ['input[type="search"]', 'input[aria-label*="Search" i]']
  for (const s of selectors) {
    const el = document.querySelector<HTMLInputElement>(s)
    if (el) {
      el.focus()
      el.select()
      return
    }
  }
}

export function KeyboardShortcuts() {
  const router = useRouter()
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    const map: Record<string, (e: KeyboardEvent) => void> = {}

    for (const s of SHORTCUTS) {
      const keyList = Array.isArray(s.keys) ? s.keys : [s.keys]
      for (const k of keyList) {
        map[k] = (e: KeyboardEvent) => {
          // Skip if typing in a form field unless the shortcut is "/",
          // which should focus-switch from anywhere.
          const target = e.target as HTMLElement | null
          const typing = target && (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
          )
          if (typing && k !== '/' && k !== '?' && k !== 'Shift+?') return
          e.preventDefault()
          s.action({ router, setHelpOpen })
        }
      }
    }

    // Escape closes the help modal when open.
    map['Escape'] = () => setHelpOpen(false)

    const unbind = tinykeys(window, map)
    return () => unbind()
  }, [router])

  const close = useCallback(() => setHelpOpen(false), [])

  if (!helpOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="max-w-md w-full mx-4 rounded-2xl bg-[#0D0D0D] border border-[#1E1E1E] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#1E1E1E] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="text-[#555] hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>
        <ul className="p-2">
          {SHORTCUTS.filter((s, i, arr) => arr.findIndex((x) => x.description === s.description) === i).map((s) => (
            <li key={s.description} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="text-[#aaa]">{s.description}</span>
              <kbd className="font-mono text-[11px] px-2 py-1 rounded-md bg-[#1A1A1A] border border-[#252525] text-[#C8FF47]">
                {s.label}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
