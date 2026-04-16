'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

const LOGO = 'https://1jorjbbfajvf5rug.public.blob.vercel-storage.com/maze_logo.svg'

export function Footer() {
  const t    = useTranslations('footer')
  const year = new Date().getFullYear()

  const workLinks = [
    { href: '/portfolio',                   label: 'Portfolio' },
    { href: '/portfolio?cat=branding',      label: 'Branding' },
    { href: '/portfolio?cat=identity',      label: 'Identity' },
    { href: '/portfolio?cat=naming',        label: 'Naming' },
    { href: '/portfolio?cat=packaging',     label: 'Packaging' },
    { href: '/portfolio?cat=print',         label: 'Print' },
    { href: '/portfolio?cat=art-direction', label: 'Art Direction' },
  ]

  const studioLinks = [
    { href: '/about',    label: 'About' },
    { href: '/services', label: 'Services' },
    { href: '/contact',  label: 'Contact' },
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

      {/* Links grid */}
      <div className="px-6 md:px-10 py-14 grid grid-cols-2 md:grid-cols-4 gap-10">

        {/* Column 1 — Logo + tagline */}
        <div className="col-span-2 md:col-span-1">
          <img
            src={LOGO}
            alt="MAZE"
            style={{ height: '28px', width: 'auto', filter: 'brightness(0) invert(1)' }}
          />
          <p className="mt-4 body-lg text-maze-muted max-w-xs whitespace-pre-line">
            {t('tagline')}
          </p>
        </div>

        {/* Column 2 — Work */}
        <div>
          <p className="label-sm text-maze-muted mb-5">{t('groups.Work')}</p>
          <ul className="space-y-3">
            {workLinks.map((link) => (
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

        {/* Column 3 — Studio */}
        <div>
          <p className="label-sm text-maze-muted mb-5">{t('groups.Studio')}</p>
          <ul className="space-y-3">
            {studioLinks.map((link) => (
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

        {/* Column 4 — Social */}
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
