'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export function Footer() {
  const t    = useTranslations('footer')
  const year = new Date().getFullYear()

  const internalLinks = [
    { group: t('groups.Work'), links: [
      { href: '/portfolio',              label: 'Portfolio' },
      { href: '/portfolio?cat=branding', label: 'Branding' },
      { href: '/portfolio?cat=ui-ux',    label: 'UI / UX' },
      { href: '/portfolio?cat=print',    label: 'Print' },
    ]},
    { group: t('groups.Studio'), links: [
      { href: '/about',    label: 'About' },
      { href: '/services', label: 'Services' },
      { href: '/contact',  label: 'Contact' },
    ]},
  ]

  const socialLinks = [
    { label: 'Instagram', href: 'https://instagram.com/mazestudio' },
    { label: 'Behance',   href: 'https://behance.net/mazestudio' },
    { label: 'LinkedIn',  href: 'https://linkedin.com/company/mazestudio' },
    { label: 'Telegram',  href: 'https://t.me/mazestudio' },
  ]

  return (
    <footer className="border-t border-maze-border bg-maze-black">
      {/* CTA strip */}
      <div className="px-6 md:px-10 py-20 md:py-28 border-b border-maze-border">
        <p className="label-sm text-maze-muted mb-6">{t('readyLabel')}</p>
        <a
          href="mailto:hello@maze.uz"
          className="display-lg text-maze-cream hover:text-maze-lime transition-colors duration-300 inline-block"
          data-cursor="hover"
        >
          hello@maze.uz ↗
        </a>
      </div>

      {/* Links */}
      <div className="px-6 md:px-10 py-14 grid grid-cols-2 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <span className="text-2xl font-black text-maze-cream tracking-tight">MAZE</span>
          <p className="mt-3 body-lg text-maze-muted max-w-xs whitespace-pre-line">
            {t('tagline')}
          </p>
        </div>

        {/* Internal link groups */}
        {internalLinks.map(({ group, links }) => (
          <div key={group}>
            <p className="label-sm text-maze-muted mb-5">{group}</p>
            <ul className="space-y-3">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="body-lg text-maze-muted hover:text-maze-cream transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Social links */}
        <div>
          <p className="label-sm text-maze-muted mb-5">{t('groups.Social')}</p>
          <ul className="space-y-3">
            {socialLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="body-lg text-maze-muted hover:text-maze-cream transition-colors duration-200"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-6 md:px-10 py-6 border-t border-maze-border flex flex-col sm:flex-row justify-between gap-2">
        <p className="label-sm text-maze-muted">
          © {year} MAZE Studio. {t('rights')}
        </p>
        <p className="label-sm text-maze-muted">
          {t('builtBy')}
        </p>
      </div>
    </footer>
  )
}
