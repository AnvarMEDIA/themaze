'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { SiteSettings } from '@/lib/settings'
import { telegramHref, telegramDisplay } from '@/lib/utils'

const LOGO    = 'https://1jorjbbfajvf5rug.public.blob.vercel-storage.com/maze_logo.svg'
const FOUNDED = 2019

// ─── Social icon SVGs ─────────────────────────────────────────────────────────
function IconInstagram() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
    </svg>
  )
}

function IconBehance() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.443 5.35c.639 0 1.23.05 1.77.198.541.148.984.395 1.328.742.344.348.574.793.689 1.34.116.546.141 1.19.067 1.885-.173 1.42-.73 2.44-1.674 3.006-.944.57-2.162.856-3.658.856H2V5.35h5.443zm-.35 5.907c.508 0 .943-.05 1.302-.148.36-.1.656-.257.89-.47.235-.214.4-.491.494-.834.093-.343.121-.756.084-1.23-.05-.44-.168-.81-.354-1.109-.187-.298-.444-.52-.77-.667-.328-.147-.72-.22-1.177-.22H4.8v4.678h2.293zm8.963-5.905h5.476v1.44h-5.476V5.352zm.54 8.948c-.235.44-.59.793-1.064 1.063-.474.27-1.064.404-1.77.404-.706 0-1.317-.14-1.836-.42-.52-.28-.94-.672-1.262-1.175-.32-.503-.543-1.082-.667-1.737-.124-.656-.17-1.352-.14-2.088.03-.706.13-1.373.3-2.002.17-.63.44-1.18.81-1.647.37-.468.836-.84 1.397-1.114.562-.274 1.226-.411 1.99-.411.764 0 1.427.148 1.99.444.562.297 1.02.7 1.372 1.21.353.51.591 1.094.716 1.75.124.656.148 1.353.07 2.09H14.8c-.03.78.124 1.387.46 1.82zm-1.97-4.79c-.323-.348-.82-.522-1.49-.522-.436 0-.8.074-1.09.222-.29.148-.52.336-.694.564-.172.228-.295.474-.367.74-.073.264-.112.522-.115.772h4.01c-.06-.748-.254-1.428-.254-1.776z"/>
    </svg>
  )
}

function IconLinkedIn() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
      <rect x="2" y="9" width="4" height="12"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  )
}

function IconTelegram() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  )
}

function IconTwitterX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}


interface Props {
  settings: SiteSettings
}

export function Footer({ settings }: Props) {
  const t           = useTranslations('footer')
  const tLegal      = useTranslations('legal')
  const currentYear = new Date().getFullYear()

  // Work links split into 2 columns
  const workLinksA = [
    { href: '/portfolio',                   label: t('nav.portfolio') },
    { href: '/portfolio?cat=branding',      label: t('nav.branding') },
    { href: '/portfolio?cat=identity',      label: t('nav.identity') },
    { href: '/portfolio?cat=naming',        label: t('nav.naming') },
  ]
  const workLinksB = [
    { href: '/portfolio?cat=packaging',     label: t('nav.packaging') },
    { href: '/portfolio?cat=print',         label: t('nav.print') },
    { href: '/portfolio?cat=art-direction', label: t('nav.artDirection') },
  ]

  const studioLinks = [
    { href: '/about',    label: t('nav.about') },
    { href: '/services', label: t('nav.services') },
    { href: '/contact',  label: t('nav.contact') },
  ]

  const FALLBACK_SOCIALS = [
    { label: 'Instagram', href: 'https://instagram.com/mazestudio',        icon: <IconInstagram /> },
    { label: 'Behance',   href: 'https://behance.net/mazestudio',           icon: <IconBehance />  },
    { label: 'LinkedIn',  href: 'https://linkedin.com/company/mazestudio', icon: <IconLinkedIn /> },
    { label: 'Telegram',  href: 'https://t.me/mazestudio',                 icon: <IconTelegram /> },
  ]

  const socialLinks = ([
    settings.instagram && { label: 'Instagram',   href: settings.instagram,                      icon: <IconInstagram /> },
    settings.behance   && { label: 'Behance',      href: settings.behance,                        icon: <IconBehance />  },
    settings.linkedin  && { label: 'LinkedIn',     href: settings.linkedin,                       icon: <IconLinkedIn /> },
    settings.telegram  && { label: 'Telegram',     href: telegramHref(settings.telegram),         icon: <IconTelegram /> },
    settings.twitter   && { label: 'X (Twitter)',  href: settings.twitter,                        icon: <IconTwitterX /> },
  ].filter(Boolean) as { label: string; href: string; icon: React.ReactNode }[]) || FALLBACK_SOCIALS

  const phoneDisplay = settings.phone || '+998 90 123 45 67'
  const phoneHref    = `tel:${phoneDisplay.replace(/\s/g, '')}`
  const tgHref   = telegramHref(settings.telegram || 'mazestudio')
  const tgDisplay = telegramDisplay(settings.telegram || '')
  const email    = settings.email || 'hello@maze.uz'

  return (
    <footer className="border-t border-maze-border bg-maze-black">

      {/* ── CTA strip ──────────────────────────────────────────────────────────── */}
      <div className="px-6 md:px-10 py-20 md:py-28 border-b border-maze-border">
        <p className="label-sm text-maze-muted mb-6 tracking-widest uppercase">{t('readyLabel')}</p>

        {/* Email — largest */}
        <a
          href={`mailto:${email}`}
          className="display-lg text-maze-cream hover:text-maze-lime transition-colors duration-300 inline-block"
          data-cursor="hover"
        >
          {email} ↗
        </a>

        {/* Phone + Telegram — large */}
        <div className="mt-14 flex flex-col sm:flex-row gap-4 sm:gap-10">
          {phoneDisplay && (
            <a
              href={phoneHref}
              className="text-2xl md:text-3xl font-bold text-maze-muted hover:text-maze-lime transition-colors duration-200 inline-flex items-center gap-3"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-maze-lime flex-shrink-0">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.06 6.06l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/>
              </svg>
              {phoneDisplay}
            </a>
          )}
          {settings.telegram && (
            <a
              href={tgHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-2xl md:text-3xl font-bold text-maze-muted hover:text-maze-lime transition-colors duration-200 inline-flex items-center gap-3"
            >
              <span className="text-maze-lime flex-shrink-0"><IconTelegram /></span>
              {tgDisplay}
            </a>
          )}
        </div>
      </div>

      {/* ── Main links grid ─────────────────────────────────────────────────────── */}
      <div className="px-6 md:px-10 pt-16 pb-12 grid grid-cols-2 lg:grid-cols-5 gap-x-10 gap-y-12">

        {/* Logo + tagline — spans 2 cols on mobile */}
        <div className="col-span-2 lg:col-span-1">
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

        {/* Work — column A */}
        <div>
          <p className="text-xs font-semibold text-maze-muted mb-5 tracking-widest uppercase">{t('groups.Work')}</p>
          <ul className="space-y-3">
            {workLinksA.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-maze-muted hover:text-maze-cream transition-colors duration-200">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Work — column B (no heading, continues the list) */}
        <div>
          <p className="text-xs font-semibold text-maze-muted mb-5 tracking-widest uppercase opacity-0 select-none">–</p>
          <ul className="space-y-3">
            {workLinksB.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-maze-muted hover:text-maze-cream transition-colors duration-200">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Studio */}
        <div>
          <p className="text-xs font-semibold text-maze-muted mb-5 tracking-widest uppercase">{t('groups.Studio')}</p>
          <ul className="space-y-3">
            {studioLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-maze-muted hover:text-maze-cream transition-colors duration-200">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Social — with icons */}
        <div>
          <p className="text-xs font-semibold text-maze-muted mb-5 tracking-widest uppercase">{t('groups.Social')}</p>
          <ul className="space-y-3">
            {(socialLinks.length > 0 ? socialLinks : FALLBACK_SOCIALS).map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-sm text-maze-muted hover:text-maze-cream transition-colors duration-200"
                >
                  <span>{link.icon}</span>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────────────────── */}
      <div className="px-6 md:px-10 py-5 border-t border-maze-border flex flex-col sm:flex-row justify-between items-center gap-3">
        <p className="text-xs text-maze-muted tracking-widest">
          © {FOUNDED}–{currentYear} MAZE Studio. {t('rights')}
        </p>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-maze-muted">
          <Link href="/legal/privacy" className="hover:text-maze-cream transition-colors">
            {tLegal('privacy.title')}
          </Link>
          <Link href="/legal/terms" className="hover:text-maze-cream transition-colors">
            {tLegal('terms.title')}
          </Link>
          <Link href="/legal/cookies" className="hover:text-maze-cream transition-colors">
            {tLegal('cookies.title')}
          </Link>
        </nav>
        <p className="text-xs text-maze-muted tracking-wide">
          {t('builtBy')}
        </p>
      </div>
    </footer>
  )
}
