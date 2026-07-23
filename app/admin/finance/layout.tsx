import { FinanceNav } from '@/components/admin/finance/FinanceNav'

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <FinanceNav />
      {children}
    </div>
  )
}
