import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSession } from '@/lib/auth'
import { routing } from '@/i18n/routing'
import { isServiceSlug } from '@/lib/services'
import { saveServiceCover } from '@/lib/serviceCovers'
import { coverFileExists, coverFileOf, ogFileFor, removeCoverFilesExcept } from '@/lib/serviceCoverFiles'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  coverDesktop: z.string().max(500).nullable(),
  coverMobile:  z.string().max(500).nullable(),
  coverAlt:     z.object({ ru: z.string().max(300), en: z.string().max(300) }),
})

/**
 * Save a service's cover (Admin → Услуги → <service>): the two pictures as
 * uploaded (POST /api/services/covers/upload), or null to have none, and
 * the alt text in both languages.
 *
 * Only this service's own cover files that really exist are taken. The
 * link-preview picture is the one made with the desktop picture. Then every
 * other file of this service's covers is deleted (the ones replaced or
 * removed, and uploads never saved), and both language versions of the page
 * are rebuilt on their next request: no deploy.
 */
export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!await getAdminSession()) return NextResponse.json({ error: 'Нужно войти в админку.' }, { status: 401 })
  const { slug } = params
  if (!isServiceSlug(slug)) return NextResponse.json({ error: 'Нет такой услуги.' }, { status: 404 })

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Неверные данные.' }, { status: 400 })
  const { coverDesktop, coverMobile, coverAlt } = parsed.data

  for (const [url, kind] of [[coverDesktop, 'desktop'], [coverMobile, 'mobile']] as const) {
    if (!url) continue
    if (!coverFileOf(slug, url, kind) || !await coverFileExists(slug, url)) {
      return NextResponse.json({ error: `Файл обложки (${kind === 'desktop' ? 'десктоп' : 'мобайл'}) не найден — загрузите его заново.` }, { status: 400 })
    }
  }
  const og = coverDesktop ? ogFileFor(coverDesktop) : null
  const coverOg = og && coverFileOf(slug, og, 'og') && await coverFileExists(slug, og) ? og : null

  try {
    const { saved } = await saveServiceCover(slug, { coverDesktop, coverMobile, coverOg, coverAlt })

    // A failed clean-up does not undo the save: the next save of this service tries again.
    let removed = 0
    try {
      removed = (await removeCoverFilesExcept(slug, [saved.coverDesktop, saved.coverMobile, saved.coverOg])).length
    } catch (err) {
      console.error('[covers] old files could not be deleted:', err instanceof Error ? err.message : err)
    }

    for (const locale of routing.locales) revalidatePath(`/${locale}/services/${slug}`)
    return NextResponse.json({ cover: saved, removed })
  } catch (err) {
    console.error('[covers] save failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Не удалось сохранить. Попробуйте ещё раз.' }, { status: 500 })
  }
}
