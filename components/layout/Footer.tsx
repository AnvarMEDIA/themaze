'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

const LOGO = 'https://1jorjbbfajvf5rug.public.blob.vercel-storage.com/maze_logo.svg'
const FOUNDED = 2019

// ─── Social icon SVGs ─────────────────────────────────────────────────────────
function IconInstagram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
    </svg>
  )
}

function IconBehance() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.443 5.35c.639 0 1.23.05 1.77.198.541.148.984.395 1.328.742.344.348.574.793.689 1.34.116.546.141 1.19.067 1.885-.173 1.42-.73 2.44-1.674 3.006-.944.57-2.162.856-3.658.856H2V5.35h5.443zm-.35 5.907c.508 0 .943-.05 1.302-.148.36-.1.656-.257.89-.47.235-.214.4-.491.494-.834.093-.343.121-.756.084-1.23-.05-.44-.168-.81-.354-1.109-.187-.298-.444-.52-.77-.667-.328-.147-.72-.22-1.177-.22H4.8v4.678h2.293zm8.963-5.905h5.476v1.44h-5.476V5.352zm.54 8.948c-.235.44-.59.793-1.064 1.063-.474.27-1.064.404-1.77.404-.706 0-1.317-.14-1.836-.42-.52-.28-.94-.672-1.262-1.175-.32-.503-.543-1.082-.667-1.737-.124-.656-.17-1.352-.14-2.088.03-.706.13-1.373.3-2.002.17-.63.44-1.18.81-1.647.37-.468.836-.84 1.397-1.114.562-.274 1.226-.411 1.99-.411.764 0 1.427.148 1.99.444.562.297 1.02.7 1.372 1.21.353.51.591 1.094.716 1.75.124.656.148 1.353.07 2.09H14.8c-.03.78.124 1.387.46 1.82zm-1.97-4.79c-.323-.348-.82-.522-1.49-.522-.436 0-.8.074-1.09.222-.29.148-.52.336-.694.564-.172.228-.295.474-.367.74-.073.264-.112.522-.115.772h4.01c-.06-.748-.254-1.428-.254-1.776z"/>
    </svg>
  )
}

function IconLinkedIn() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  )
}

function IconTelegram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  )
}

function IconPhone() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.06 6.06l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/>
    </svg>
  )
}

function IconMail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  )
}

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
    { label: 'Instagram', href: 'https://instagram.com/mazestudio',          icon: <IconInstagram /> },
    { label: 'Behance',   href: 'https://behance.net/mazestudio',             icon: <IconBehance />  },
    { label: 'LinkedIn',  href: 'https://linkedin.com/company/mazestudio',   icon: <IconLinkedIn /> },
    { label: 'Telegram',  href: 'https://t.me/mazestudio',                   icon: <IconTelegram /> },
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
        <div className="mt-4 flex flex-wrap gap-6 items-center">
          <a
            href="tel:+998901234567"
            className="inline-flex items-center gap-2 text-maze-muted hover:text-maze-lime transition-colors duration-200 text-sm"
          >
            <IconPhone />
            +998 90 123 45 67
          </a>
          <a
            href="https://t.me/mazestudio"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-maze-muted hover:text-maze-lime transition-colors duration-200 text-sm"
          >
            <IconTelegram />
            @mazestudio
          </a>
        </div>
      </div>

      {/* Main links grid — row 1 */}
      <div className="px-6 md:px-10 pt-16 pb-8 grid grid-cols-2 md:grid-cols-4 gap-10">

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

        {/* Column 4 — Social with icons */}
        <div>
          <p className="text-xs font-semibold text-maze-muted mb-5 tracking-widest uppercase">{t('groups.Social')}</p>
          <ul className="space-y-3">
            {socialLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-sm text-maze-muted hover:text-maze-cream transition-colors duration-200"
                >
                  <span className="text-maze-muted">{link.icon}</span>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Row 2 — contact info strip */}
      <div className="px-6 md:px-10 py-6 border-t border-maze-border/50 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a
          href="mailto:hello@maze.uz"
          className="inline-flex items-center gap-2 text-xs text-maze-muted hover:text-maze-cream transition-colors duration-200"
        >
          <IconMail />
          hello@maze.uz
        </a>
        <a
          href="tel:+998901234567"
          className="inline-flex items-center gap-2 text-xs text-maze-muted hover:text-maze-cream transition-colors duration-200"
        >
          <IconPhone />
          +998 90 123 45 67
        </a>
        <p className="text-xs text-maze-muted">{t('location')}</p>
      </div>

      {/* Bottom bar */}
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
