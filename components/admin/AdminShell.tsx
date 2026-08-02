'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AdminSidebar } from './AdminSidebar'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [navOpen, setNavOpen] = useState(false)

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setNavOpen(false) }, [pathname])

  // Full-bleed (no sidebar) on standalone gate screens and on the printable
  // brief sheet, which is its own A4 document.
  const isFullBleed =
    pathname === '/admin/login' ||
    pathname === '/admin/finance/unlock' ||
    /^\/admin\/briefs\/[^/]+\/print$/.test(pathname)
  if (isFullBleed) return <>{children}</>

  return (
    <div className="flex min-h-screen">
      {/* Mobile top bar (hamburger + logo). Hidden from lg up. */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-14 z-40 flex items-center gap-3 px-4 bg-[#0D0D0D] border-b border-[#1E1E1E]">
        <button
          onClick={() => setNavOpen(true)}
          aria-label="Open menu"
          className="w-9 h-9 -ml-1 flex items-center justify-center rounded-lg text-[#bbb] hover:text-white hover:bg-[#1A1A1A] transition-colors active:scale-95"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://1jorjbbfajvf5rug.public.blob.vercel-storage.com/maze_logo.svg"
          alt="MAZE Studio"
          style={{ height: '20px', width: 'auto', filter: 'brightness(0) invert(1)' }}
        />
        <span className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#C8FF47] bg-[#C8FF47]/10 px-2 py-0.5 rounded-full">
          Admin
        </span>
      </header>

      {/* Backdrop for the mobile drawer */}
      {navOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 fin-fade"
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <AdminSidebar mobileOpen={navOpen} onNavigate={() => setNavOpen(false)} />

      {/* min-w-0 lets this flex item shrink to the viewport instead of being
          forced wide by content (the classic flexbox overflow trap on mobile);
          overflow-x-clip is a safety net that never creates a scroll container,
          so position: sticky inside still works. */}
      <main className="flex-1 min-w-0 overflow-x-clip min-h-screen pt-14 lg:pt-0 lg:pl-56">{children}</main>
    </div>
  )
}
