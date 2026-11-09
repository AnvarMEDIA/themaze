import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import { AdminShell } from '@/components/admin/AdminShell'
import { KeyboardShortcuts } from '@/components/admin/KeyboardShortcuts'

/**
 * The panel is disallowed in robots.txt, but a Disallow only stops crawling —
 * a URL that leaks into a link or a browser extension can still be indexed
 * title-only. Without this, /admin/login inherited the root layout's
 * `index, follow` and actively invited that. Crawlers that ignore robots.txt
 * (several AI agents do) see the noindex; those that honour it never arrive.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* The public site went black and white; the admin keeps its lime.
          Same variables as app/globals.css, set back for these pages only.
          The admin is dark whatever the visitor chose on the site: the
          theme switch puts .light on <html> for every page, so that class
          is answered here with the dark values (and the dark colour scheme,
          which next-themes otherwise sets inline). A preview box that is
          itself .light keeps its own light values. */}
      <style>{`
        :root, .dark { --lime: 200 255 71; --color-lime: #C8FF47; --accent-hover: 240 238 230; }
        html.light {
          --bg: 8 8 8; --surface: 17 17 17; --gray: 30 30 30; --border: 37 37 37;
          --text: 237 235 227; --muted: 90 90 90;
          --lime: 200 255 71; --on-accent: 10 10 10; --accent-hover: 240 238 230; --dot: 255 255 255;
          --color-bg: #080808; --color-surface: #111111; --color-border: #252525;
          --color-text: #EDEBE3; --color-muted: #5A5A5A; --color-lime: #C8FF47;
          color-scheme: dark !important;
        }
        body { background: #080808; color: #EDEBE3; }
        * { cursor: auto !important; }
      `}</style>
      <AdminShell>{children}</AdminShell>
      <KeyboardShortcuts />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1A1A1A',
            color: '#EDEBE3',
            border: '1px solid #252525',
            fontFamily: 'var(--font-sans)',
          },
        }}
      />
    </>
  )
}
