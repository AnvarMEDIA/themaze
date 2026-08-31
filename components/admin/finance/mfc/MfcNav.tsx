'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useFinanceLang } from '../lang'

const TABS = [
  { href: '/admin/finance/mfc',            key: 'mfc.tabDash' },
  { href: '/admin/finance/mfc/expenses',   key: 'mfc.tabList' },
  { href: '/admin/finance/mfc/categories', key: 'mfc.tabCats' },
]

/**
 * Second-level tabs inside MFC. It sits under the finance nav and sticks with
 * it, so the three screens stay one tap apart while scrolling a long list.
 */
export function MfcNav() {
  const pathname = usePathname()
  const { t } = useFinanceLang()

  const isActive = (href: string) =>
    href === '/admin/finance/mfc' ? pathname === href : pathname.startsWith(href)

  return (
    <div className="sticky top-[6.5rem] lg:top-14 z-20 bg-[#080808]/85 backdrop-blur border-b border-[#141414]">
      <div className="flex items-center gap-1 px-4 lg:px-6 h-12 max-w-[1400px] mx-auto overflow-x-auto scrollbar-none">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors duration-150 ${
              isActive(tab.href)
                ? 'bg-[#C8FF47]/10 text-[#C8FF47]'
                : 'text-[#777] hover:text-white hover:bg-[#161616]'
            }`}
          >
            {t(tab.key)}
          </Link>
        ))}
      </div>
    </div>
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
