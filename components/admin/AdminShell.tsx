'use client'

import { usePathname } from 'next/navigation'
import { AdminSidebar } from './AdminSidebar'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin  = pathname === '/admin/login'

  if (isLogin) return <>{children}</>

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="pl-56 flex-1 min-h-screen">{children}</main>
    </div>
  )
}
