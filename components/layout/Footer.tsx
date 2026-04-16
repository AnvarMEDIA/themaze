'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

const LOGO = 'https://1jorjbbfajvf5rug.public.blob.vercel-storage.com/maze_logo.svg'
const FOUNDED = 2019

export function Footer() {
  const t           = useTranslations('footer')
  const currentYear = new Date().getFullYear()

  const workLinks = [
    { href: '/portfolio',                   label: t('nav.portfolio') },
    { href: '/portfolio?cat=branding',      label: t('nav.branding') },
    { href: '/portfolio?cat=identity',      label: t('nav.identity') },
    { href: '/portfolio?cat=naming',        label: t('nav.naming') },
    { href: '/portfolio?cat=packaging',     label: t('nav.packaging') },
    { href: '/portfolio?cat=print',         label: t('nav.print') },
    { href: '/portfolio?cat=art-direction', label: t('nav.artDirection') },
  ]

  const studioLinks = [
    { href: '/about',    label: t('nav.about') },
    { href: '/services', label: t('nav.services') },
    { href: '/contact',  label: t('nav.contact') },
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
        <p className="label-sm text-maze-muted mb-6 tracking-widest uppercase">{t('readyLabel')}</p>
        <a
          href="mailto:hello@maze.uz"
          className="display-lg text-maze-cream hover:text-maze-lime transition-colors duration-300 inline-block"
          data-cursor="hover"
        >
          hello@maze.uz ↗
        </a>
      </div>

      {/* Main links grid */}
      <div className="px-6 md:px-10 pt-16 pb-12 grid grid-cols-2 md:grid-cols-4 gap-10">

        {/* Column 1 — Logo + tagline */}
        <div className="col-span-2 md:col-span-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO}
            alt="MAZE"
            style={{ height: '52px', width: 'auto', filter: 'brightness(0) invert(1)' }}
          />
          <p className="mt-5 text-sm text-maze-muted leading-relaxed max-w-[200px] whitespace-pre-line">
            {t('tagline')}
          </p>
        </div>

        {/* Column 2 — Work */}
        <div>
          <p className="text-xs font-semibold text-maze-muted mb-5 tracking-widest uppercase">{t('groups.Work')}</p>
          <ul className="space-y-3">
            {workLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-maze-muted hover:text-maze-cream transition-colors duration-200"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3 — Studio */}
        <div>
          <p className="text-xs font-semibold text-maze-muted mb-5 tracking-widest uppercase">{t('groups.Studio')}</p>
          <ul className="space-y-3">
            {studioLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-maze-muted hover:text-maze-cream transition-colors duration-200"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 4 — Social */}
        <div>
          <p className="text-xs font-semibold text-maze-muted mb-5 tracking-widest uppercase">{t('groups.Social')}</p>
          <ul className="space-y-3">
            {socialLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-maze-muted hover:text-maze-cream transition-colors duration-200"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar — founded year range + rights */}
      <div className="px-6 md:px-10 py-5 border-t border-maze-border flex flex-col sm:flex-row justify-between items-center gap-3">
        <p className="text-xs text-maze-muted tracking-widest">
          © {FOUNDED}–{currentYear} MAZE Studio. {t('rights')}
        </p>
        <p className="text-xs text-maze-muted tracking-wide">
          {t('builtBy')}
        </p>
      </div>
    </footer>
  )
}
