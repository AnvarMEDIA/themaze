import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminSession } from '@/lib/auth'
import { BriefContentSchema } from '@/lib/validation'
import { DEFAULT_BRIEF_CONTENT, briefLabels, getBriefContent, saveBriefContent } from '@/lib/briefContent'

export const dynamic = 'force-dynamic'

/**
 * The brief form's questions and options (lib/briefContent), for the
 * admin's editor. Both ends are admin-only: the site reads the content on
 * the server, not through here.
 *
 * GET also returns the defaults (to put a text back as it was) and how
 * option ids read in each language (for the list of sent briefs).
 */
export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  try {
    const content = await getBriefContent()
    return NextResponse.json({
      content,
      defaults: DEFAULT_BRIEF_CONTENT,
      labels: { en: briefLabels(content, 'en'), ru: briefLabels(content, 'ru') },
    })
  } catch (err) {
    console.error('[brief-content GET]', err)
    return NextResponse.json({ error: 'Failed to load the brief form' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const parsed = BriefContentSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json(
      { error: first?.message ?? 'Invalid data', path: first?.path.join('.') ?? '' },
      { status: 400 },
    )
  }

  try {
    const saved = await saveBriefContent(parsed.data)
    // The brief page is built ahead of time; rebuild it in both languages.
    revalidatePath('/[locale]/brief', 'page')
    return NextResponse.json(saved)
  } catch (err) {
    console.error('[brief-content PUT]', err)
    return NextResponse.json({ error: 'Failed to save the brief form' }, { status: 500 })
  }
}
