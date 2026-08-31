import { MfcNav } from '@/components/admin/finance/mfc/MfcNav'

export default function MfcLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MfcNav />
      {children}
    </>
  )
}
