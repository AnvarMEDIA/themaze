import { Toaster } from 'react-hot-toast'
import { AdminShell } from '@/components/admin/AdminShell'

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        body { background: #080808; color: #EDEBE3; }
        * { cursor: auto !important; }
      `}</style>
      <AdminShell>{children}</AdminShell>
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
