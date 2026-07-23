import { FinanceNav } from '@/components/admin/finance/FinanceNav'
import { FinanceLangProvider } from '@/components/admin/finance/lang'

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <FinanceLangProvider>
      <div className="min-h-screen">
        <FinanceNav />
        {children}
      </div>
    </FinanceLangProvider>
  )
}
