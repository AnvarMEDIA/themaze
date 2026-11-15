import { ServiceCoversOverview } from '@/components/admin/services/ServiceCoversOverview'
import { getServiceCovers, serviceTitles } from '@/lib/serviceCovers'
import { SERVICE_SLUGS } from '@/lib/services'

export const dynamic = 'force-dynamic'

/** Admin → Услуги: the nine services' covers, and many loaded at once. */
export default async function AdminServicesPage() {
  const covers = await getServiceCovers()
  const items = SERVICE_SLUGS.map((slug) => ({ slug, title: serviceTitles(slug).ru, cover: covers[slug] }))
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-6xl">
      <ServiceCoversOverview items={items} />
    </div>
  )
}
