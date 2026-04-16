import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'MAZE Studio — Branding & Design',
  description: 'We build brands that lead markets. Branding & design studio based in Tashkent.',
}

const LOGO = 'https://1jorjbbfajvf5rug.public.blob.vercel-storage.com/maze_logo.svg'

export default function NewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#080808', color: '#EDEBE3', minHeight: '100vh' }}>

      {/* ── Minimal nav — no theme/lang toggle ─────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 lg:px-20"
        style={{ borderBottom: '1px solid #1c1c1c' }}
      >
        <div
          className="max-w-[1440px] mx-auto flex items-center justify-between"
          style={{ height: '64px' }}
        >
          {/* Logo — white filter so it's visible on dark bg */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO}
              alt="MAZE Studio"
              style={{ height: '26px', width: 'auto', filter: 'brightness(0) invert(1)' }}
            />
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8">
            {[
              { href: '/portfolio', label: 'Work'     },
              { href: '/services',  label: 'Services' },
              { href: '/about',     label: 'About'    },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5a5a5a' }}
                className="hover:text-white transition-colors duration-200"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <Link
            href="/contact"
            style={{
              fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', background: '#C8FF47', color: '#0A0A0A',
              padding: '10px 20px', borderRadius: '99px',
            }}
            className="hover:bg-[#F0EEE6] transition-colors duration-200"
          >
            Start a project ↗
          </Link>
        </div>
      </header>

      {/* Page content */}
      {children}

    </div>
  )
}
