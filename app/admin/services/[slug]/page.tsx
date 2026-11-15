import { notFound } from 'next/navigation'
import { ServiceCoverEditor } from '@/components/admin/services/ServiceCoverEditor'
import { defaultCoverAlt, getServiceCover, serviceTitles } from '@/lib/serviceCovers'
import { isServiceSlug } from '@/lib/services'

export const dynamic = 'force-dynamic'

/**
 * Admin → Услуги → <service>: its cover. The service's words are in the
 * message files, not here: this page is the cover alone.
 */
export default async function AdminServicePage({ params }: { params: { slug: string } }) {
  if (!isServiceSlug(params.slug)) notFound()
  const { slug } = params
  const cover = await getServiceCover(slug)
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-6xl">
      <ServiceCoverEditor
        slug={slug}
        titles={serviceTitles(slug)}
        defaultAlt={{ ru: defaultCoverAlt(slug, 'ru'), en: defaultCoverAlt(slug, 'en') }}
        cover={cover}
      />
    </div>
  )
}
