import { MfcNav } from '@/components/admin/finance/mfc/MfcNav'
import { FinanceLangProvider } from '@/components/admin/finance/lang'

/**
 * MFC is its own section of the panel, alongside Finance rather than inside
 * it. The two answer different questions — the studio's books versus one
 * person's spending — and burying the second under a tab of the first meant
 * two rows of navigation to reach the screen used most often in a day.
 *
 * It still shares the finance vault: the same password unlocks both, and the
 * base currency and exchange rates come from the finance settings. It also
 * shares the EN/RU dictionary, which is why the provider is the same one.
 */
export default function MfcLayout({ children }: { children: React.ReactNode }) {
  return (
    <FinanceLangProvider>
      <div className="min-h-screen">
        <MfcNav />
        {children}
      </div>
    </FinanceLangProvider>
  )
}
