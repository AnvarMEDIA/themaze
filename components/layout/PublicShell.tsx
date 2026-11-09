import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Navbar }       from '@/components/layout/Navbar'
import { Footer }       from '@/components/layout/Footer'
import { CustomCursor } from '@/components/layout/CustomCursor'
import { SmoothScroll } from '@/components/layout/SmoothScroll'
import { JsonLd }            from '@/components/JsonLd'
import { Analytics }         from '@/components/Analytics'
import { CookieBanner }      from '@/components/CookieBanner'
import { PageviewTracker }   from '@/components/PageviewTracker'
import { SecondaryGoogleTagManager } from '@/components/GoogleTagManager'
import { NoScriptStyles }    from '@/components/NoScriptStyles'
import { Toaster }           from 'react-hot-toast'
import { getSettings }  from '@/lib/settings'
import { getInternshipSettings } from '@/lib/internshipStore'
import { organizationJsonLd, websiteJsonLd, localBusinessJsonLd } from '@/lib/jsonLd'

interface Props {
  locale:   string
  children: React.ReactNode
}

/**
 * Everything a public page stands in: the header, the footer, the
 * translations, smooth scroll, the cursor, analytics.
 *
 * A component rather than the body of app/(public)/[locale]/layout.tsx
 * because one screen is drawn outside that layout: the 404 for an address
 * no page claims, which Next renders from app/not-found.tsx. The caller
 * sets the request locale first (setRequestLocale).
 */
export async function PublicShell({ locale, children }: Props) {
  const [messages, settings, internship] = await Promise.all([
    getMessages(), getSettings(), getInternshipSettings(),
  ])

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {/* First, so a browser without scripts has these rules before it
          draws any of the content they are about. */}
      <NoScriptStyles />
      <JsonLd id="ld-organization"   data={organizationJsonLd(settings)} />
      <JsonLd id="ld-localbusiness"  data={localBusinessJsonLd(settings)} />
      <JsonLd id="ld-website"        data={websiteJsonLd()} />
      <SmoothScroll>
        <div className="noise">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-maze-lime focus:text-maze-ink focus:font-bold focus:rounded-lg"
          >
            Skip to main content
          </a>
          <CustomCursor />
          <Navbar email={settings.email || 'go@themaze.uz'} internship={internship.open} />
          <main id="main-content">{children}</main>
          <Footer settings={settings} internship={internship.open} />
        </div>
      </SmoothScroll>
      <CookieBanner />
      <Analytics />
      <PageviewTracker />
      <SecondaryGoogleTagManager />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgb(var(--surface))',
            color: 'rgb(var(--text))',
            border: '1px solid rgb(var(--border))',
            fontFamily: 'var(--font-sans)',
          },
        }}
      />
    </NextIntlClientProvider>
  )
}
