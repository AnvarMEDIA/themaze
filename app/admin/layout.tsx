import { Toaster } from 'react-hot-toast'

/**
 * Admin layout — lightweight shell with no public site chrome.
 * Root layout provides <html>/<body>; this adds only what admin needs.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        body { background: #080808; color: #EDEBE3; }
        * { cursor: auto !important; }
      `}</style>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1E1E1E',
            color: '#EDEBE3',
            border: '1px solid #252525',
            fontFamily: 'var(--font-sans)',
          },
        }}
      />
    </>
  )
}
