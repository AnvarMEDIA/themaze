'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import toast from 'react-hot-toast'

const TABS = [
  { href: '/admin/finance',              label: 'Dashboard' },
  { href: '/admin/finance/transactions', label: 'Transactions' },
  { href: '/admin/finance/projects',     label: 'Projects' },
  { href: '/admin/finance/clients',      label: 'Clients' },
  { href: '/admin/finance/settings',     label: 'Settings' },
]

export function FinanceNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [locking, setLocking] = useState(false)

  // The unlock screen renders without the nav (user isn't in yet).
  if (pathname.startsWith('/admin/finance/unlock')) return null

  const isActive = (href: string) =>
    href === '/admin/finance' ? pathname === href : pathname.startsWith(href)

  const lock = async () => {
    setLocking(true)
    await fetch('/api/finance/lock', { method: 'POST' })
    toast.success('Finance locked')
    router.push('/admin/finance/unlock')
    router.refresh()
  }

  return (
    <div className="sticky top-0 z-30 bg-[#080808]/85 backdrop-blur border-b border-[#1A1A1A]">
      <div className="flex items-center gap-1 px-6 h-14 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-2 mr-4">
          <span className="w-6 h-6 flex items-center justify-center rounded-md bg-[#C8FF47]/12 text-[#C8FF47]">
            <IconVault size={14} />
          </span>
          <span className="text-[13px] font-semibold text-white tracking-tight hidden sm:block">Finance</span>
        </div>

        <nav className="flex items-center gap-0.5 overflow-x-auto">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors duration-150 ${
                isActive(t.href)
                  ? 'bg-[#C8FF47]/10 text-[#C8FF47]'
                  : 'text-[#888] hover:text-white hover:bg-[#161616]'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={lock}
          disabled={locking}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-[#888] hover:text-[#C8FF47] hover:bg-[#161616] transition-colors active:scale-[0.97] disabled:opacity-50"
          title="Lock the finance area"
        >
          <IconLock size={14} />
          <span className="hidden sm:inline">Lock</span>
        </button>
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
