import Link from 'next/link'

const footerLinks = {
  Work: [
    { href: '/portfolio',           label: 'Portfolio' },
    { href: '/portfolio?cat=branding', label: 'Branding' },
    { href: '/portfolio?cat=ui-ux', label: 'UI / UX' },
    { href: '/portfolio?cat=print', label: 'Print' },
  ],
  Studio: [
    { href: '/about',   label: 'About' },
    { href: '/services', label: 'Services' },
    { href: '/contact', label: 'Contact' },
  ],
  Social: [
    { href: 'https://instagram.com/mazestudio',  label: 'Instagram' },
    { href: 'https://behance.net/mazestudio',    label: 'Behance' },
    { href: 'https://linkedin.com/company/mazestudio', label: 'LinkedIn' },
    { href: 'https://t.me/mazestudio',           label: 'Telegram' },
  ],
}

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-maze-border bg-maze-black">
      {/* CTA strip */}
      <div className="px-6 md:px-10 py-20 md:py-28 border-b border-maze-border">
        <p className="label-sm text-maze-muted mb-6">Ready to collaborate?</p>
        <Link
          href="/contact"
          className="display-lg text-maze-cream hover:text-maze-lime transition-colors duration-300 inline-block"
          data-cursor="hover"
        >
          hello@maze.uz ↗
        </Link>
      </div>

      {/* Links */}
      <div className="px-6 md:px-10 py-14 grid grid-cols-2 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <span className="text-2xl font-black text-maze-cream tracking-tight">MAZE</span>
          <p className="mt-3 body-lg text-maze-muted max-w-xs">
            Branding & Design Studio.<br />
            Tashkent, Uzbekistan.
          </p>
        </div>

        {/* Link groups */}
        {Object.entries(footerLinks).map(([group, links]) => (
          <div key={group}>
            <p className="label-sm text-maze-muted mb-5">{group}</p>
            <ul className="space-y-3">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="body-lg text-maze-muted hover:text-maze-cream transition-colors duration-200"
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="px-6 md:px-10 py-6 border-t border-maze-border flex flex-col sm:flex-row justify-between gap-2">
        <p className="label-sm text-maze-muted">
          © {year} MAZE Studio. All rights reserved.
        </p>
        <p className="label-sm text-maze-muted">
          Designed &amp; built by MAZE
        </p>
      </div>
    </footer>
  )
}
