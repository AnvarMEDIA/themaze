'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import toast from 'react-hot-toast'

const NAV = [
  {
    group: 'Overview',
    items: [
      { href: '/admin',           label: 'Dashboard',  icon: IconDashboard },
    ],
  },
  {
    group: 'Content',
    items: [
      { href: '/admin/projects',   label: 'Projects',   icon: IconProjects   },
      { href: '/admin/partners',   label: 'Partners',   icon: IconPartners   },
      { href: '/admin/inquiries',  label: 'Inquiries',  icon: IconInquiries  },
    ],
  },
  {
    group: 'Site',
    items: [
      { href: '/admin/settings',  label: 'Settings',   icon: IconSettings },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [pending, setPending] = useState(false)

  const logout = async () => {
    setPending(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Logged out')
    router.push('/admin/login')
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-56 bg-[#0D0D0D] border-r border-[#1E1E1E] flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1E1E1E]">
        <Link href="/admin" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://1jorjbbfajvf5rug.public.blob.vercel-storage.com/maze_logo.svg"
            alt="MAZE Studio"
            style={{ height: '24px', width: 'auto' }}
          />
          <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#C8FF47] bg-[#C8FF47]/10 px-2 py-0.5 rounded-full">
            Admin
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV.map((group) => (
          <div key={group.group}>
            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#444] px-2 mb-2">
              {group.group}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                      isActive(href)
                        ? 'bg-[#C8FF47]/10 text-[#C8FF47]'
                        : 'text-[#777] hover:text-white hover:bg-[#1A1A1A]'
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-[#1E1E1E] space-y-1">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#777] hover:text-white hover:bg-[#1A1A1A] transition-colors"
        >
          <IconExternal size={16} />
          View site
        </Link>
        <button
          onClick={logout}
          disabled={pending}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#777] hover:text-red-400 hover:bg-[#1A1A1A] transition-colors disabled:opacity-50"
        >
          <IconLogout size={16} />
          Logout
        </button>
      </div>
    </aside>
  )
}

/* ── Icons ───────────────────────────────────────────────────────────────── */

function IconDashboard({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8"/>
    </svg>
  )
}

function IconProjects({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="14" height="2" rx="1" fill="currentColor" opacity=".8"/>
      <rect x="1" y="7" width="10" height="2" rx="1" fill="currentColor" opacity=".5"/>
      <rect x="1" y="11" width="12" height="2" rx="1" fill="currentColor" opacity=".5"/>
    </svg>
  )
}

function IconPartners({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="5" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" opacity=".8"/>
      <circle cx="11" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" opacity=".5"/>
      <path d="M1 14c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".8"/>
      <path d="M11 10c1.66 0 3 1.34 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".5"/>
    </svg>
  )
}

function IconInquiries({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" opacity=".8"/>
      <path d="M4 6h8M4 9h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".6"/>
    </svg>
  )
}

function IconSettings({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconExternal({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M7 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10 2h4v4M14 2L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconLogout({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M11 5l3 3-3 3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
