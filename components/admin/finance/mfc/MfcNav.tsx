'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useFinanceLang, LangToggle } from '../lang'

const TABS = [
  { href: '/admin/mfc',            key: 'mfc.tabDash' },
  { href: '/admin/mfc/expenses',   key: 'mfc.tabList' },
  { href: '/admin/mfc/categories', key: 'mfc.tabCats' },
  { href: '/admin/mfc/telegram',   key: 'mfc.tabTelegram' },
]

/**
 * The section's own bar — the one MFC has, not the second one it used to sit
 * under. As a tab of Finance it cost two stacked strips of chrome and 161px
 * of a phone screen before any spending appeared; standing on its own it
 * costs one.
 *
 * The lock button stays, because the vault it opens is the same one: locking
 * from here closes Finance too, which is the honest thing for a button that
 * says "lock" to do.
 */
export function MfcNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useFinanceLang()
  const [locking, setLocking] = useState(false)

  const isActive = (href: string) =>
    href === '/admin/mfc' ? pathname === href : pathname.startsWith(href)

  const lock = async () => {
    setLocking(true)
    await fetch('/api/finance/lock', { method: 'POST' })
    toast.success(t('toast.locked'))
    router.push('/admin/finance/unlock')
    router.refresh()
  }

  return (
    // Pinned directly under the admin shell's mobile header (h-14), and at the
    // top of the window once the sidebar takes over from lg up.
    <div className="sticky top-14 lg:top-0 z-30 bg-[#080808]/85 backdrop-blur border-b border-[#1A1A1A]">
      <div className="flex items-center gap-1 px-4 lg:px-6 h-14 max-w-[1400px] mx-auto">
        {/* The badge steps aside on a phone. Four tabs, a language toggle and
            a lock button already outgrow 390px — the strip scrolls, and every
            pixel spent on saying where you are is a pixel of a tab label cut
            in half. The sidebar says it anyway. */}
        <div className="hidden sm:flex items-center gap-2 mr-4 flex-shrink-0">
          <span className="w-6 h-6 flex items-center justify-center rounded-md bg-[#C8FF47]/12 text-[#C8FF47]">
            <IconWallet size={14} />
          </span>
          <span className="text-[13px] font-semibold text-white tracking-tight">
            {t('nav.mfc')}
          </span>
        </div>

        <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-none min-w-0 flex-1">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors duration-150 ${
                isActive(tab.href)
                  ? 'bg-[#C8FF47]/10 text-[#C8FF47]'
                  : 'text-[#888] hover:text-white hover:bg-[#161616]'
              }`}
            >
              {t(tab.key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 flex-shrink-0 pl-1.5">
          <LangToggle />
          <button
            onClick={lock}
            disabled={locking}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-[#888] hover:text-[#C8FF47] hover:bg-[#161616] transition-colors active:scale-[0.97] disabled:opacity-50"
            title={t('nav.lockTitle')}
          >
            <IconLock size={14} />
            <span className="hidden sm:inline">{t('nav.lock')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function IconWallet({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="3.5" width="13" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.4" opacity=".6" />
      <circle cx="11.5" cy="9.75" r="1" fill="currentColor" />
    </svg>
  )
}

function IconLock({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="3" y="7" width="10" height="7" rx="1.8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

/**
 * The add button. Fixed bottom-right on a phone — where a thumb already is,
 * and clear of the browser chrome via the safe-area inset — and a normal
 * button in the page header on a desktop.
 */
export function AddButton({ onClick }: { onClick: () => void }) {
  const { t } = useFinanceLang()
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label={t('mfc.add')}
        className="sm:hidden fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40
                   w-14 h-14 rounded-full bg-[#C8FF47] text-[#0A0A0A] shadow-lg shadow-black/40
                   flex items-center justify-center transition-transform duration-150
                   active:scale-[0.94] hover:bg-[#D6FF6E]"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>

      <button
        type="button"
        onClick={onClick}
        className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C8FF47] text-[#0A0A0A]
                   text-[13px] font-bold transition-colors duration-150 hover:bg-[#D6FF6E] active:scale-[0.97]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
        {t('mfc.addShort')}
      </button>
    </>
  )
}
