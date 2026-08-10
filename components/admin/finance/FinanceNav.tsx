'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useFinanceLang, LangToggle } from './lang'

const TABS = [
  { href: '/admin/finance',              key: 'nav.dashboard' },
  { href: '/admin/finance/calendar',     key: 'nav.calendar' },
  { href: '/admin/finance/transactions', key: 'nav.transactions' },
  { href: '/admin/finance/projects',     key: 'nav.projects' },
  { href: '/admin/finance/clients',      key: 'nav.clients' },
  { href: '/admin/finance/recurring',    key: 'nav.recurring' },
  { href: '/admin/finance/reports',      key: 'nav.reports' },
  { href: '/admin/finance/settings',     key: 'nav.settings' },
]

export function FinanceNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useFinanceLang()
  const [locking, setLocking] = useState(false)

  // The unlock screen renders without the nav (user isn't in yet).
  if (pathname.startsWith('/admin/finance/unlock')) return null

  const isActive = (href: string) =>
    href === '/admin/finance' ? pathname === href : pathname.startsWith(href)

  const lock = async () => {
    setLocking(true)
    await fetch('/api/finance/lock', { method: 'POST' })
    toast.success(t('toast.locked'))
    router.push('/admin/finance/unlock')
    router.refresh()
  }

  return (
    <div className="sticky top-14 lg:top-0 z-30 bg-[#080808]/85 backdrop-blur border-b border-[#1A1A1A]">
      <div className="flex items-center gap-1 px-4 lg:px-6 h-14 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-2 mr-2 sm:mr-4 flex-shrink-0">
          <span className="w-6 h-6 flex items-center justify-center rounded-md bg-[#C8FF47]/12 text-[#C8FF47]">
            <IconVault size={14} />
          </span>
          <span className="text-[13px] font-semibold text-white tracking-tight hidden sm:block">{t('nav.finance')}</span>
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

function IconVault({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 5.6V4M8 12v-1.6M10.4 8H12M4 8h1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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
