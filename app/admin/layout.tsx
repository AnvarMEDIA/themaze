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
      <style>{`
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
