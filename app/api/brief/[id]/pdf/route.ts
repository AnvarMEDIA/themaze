import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { getBriefs } from '@/lib/briefs'
import { getSettings } from '@/lib/settings'
import { briefLabels, getBriefContent } from '@/lib/briefContent'
import { briefPdfFilename, renderBriefPdf } from '@/lib/pdf/briefPdf'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/brief/<id>/pdf?lang=ru|en — one sent brief as a PDF file
 * (lib/pdf/briefPdf), downloaded straight from the admin. Admin-only: it is
 * a client's name, phone and plans.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const lang = req.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'ru'

  try {
    const [briefs, settings, content] = await Promise.all([getBriefs(), getSettings(), getBriefContent()])
    const brief = briefs.find((b) => b.id === params.id)
    if (!brief) return NextResponse.json({ error: 'Brief not found' }, { status: 404 })

    const pdf = await renderBriefPdf({
      brief,
      lang,
      labels: briefLabels(content, lang),
      contacts: ['maze.uz', settings.email || 'go@themaze.uz', settings.phone].filter((x): x is string => !!x?.trim()),
    })
    const name = briefPdfFilename(brief, lang)

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        // The readable name for browsers that take it, a plain one for those that don't.
        'Content-Disposition': `attachment; filename="${name.ascii}"; filename*=UTF-8''${encodeURIComponent(name.utf8)}`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('[brief pdf]', err)
    return NextResponse.json({ error: 'Could not make the PDF' }, { status: 500 })
  }
}
