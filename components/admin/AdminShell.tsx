'use client'

import { usePathname } from 'next/navigation'
import { AdminSidebar } from './AdminSidebar'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Full-bleed (no sidebar) on standalone gate screens.
  const isFullBleed = pathname === '/admin/login' || pathname === '/admin/finance/unlock'

  if (isFullBleed) return <>{children}</>

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="pl-56 flex-1 min-h-screen">{children}</main>
    </div>
  )
}
