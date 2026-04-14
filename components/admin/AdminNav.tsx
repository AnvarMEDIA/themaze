'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export function AdminNav() {
  const pathname = usePathname()
  const router   = useRouter()

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Logged out')
    router.push('/admin/login')
    router.refresh()
  }

  const links = [
    { href: '/admin',             label: 'Projects' },
    { href: '/admin/new',         label: '+ New project' },
    { href: '/',                  label: 'View site ↗' },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-maze-dark border-b border-maze-border px-6 py-4 flex items-center justify-between">
      <Link href="/admin" className="font-black text-maze-cream text-lg tracking-tight">
        MAZE <span className="text-maze-muted font-normal text-sm ml-1">Admin</span>
      </Link>

      <nav className="flex items-center gap-6">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            target={link.label.includes('↗') ? '_blank' : undefined}
            className={`label-sm transition-colors ${
              pathname === link.href && !link.label.includes('↗')
                ? 'text-maze-lime'
                : 'text-maze-muted hover:text-maze-cream'
            }`}
          >
            {link.label}
          </Link>
        ))}
        <button
          onClick={logout}
          className="label-sm text-maze-muted hover:text-red-400 transition-colors ml-4"
        >
          Logout
        </button>
      </nav>
    </header>
  )
}
