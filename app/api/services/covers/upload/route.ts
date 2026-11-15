import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { isServiceSlug } from '@/lib/services'
import { coverFileProblem, type CoverSlot } from '@/lib/serviceCoverSpec'
import { CoverImageError, processCover } from '@/lib/serviceCoverImage'
import { coverFileName, putCoverFile } from '@/lib/serviceCoverFiles'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * One picture for a service cover (Admin → Услуги): checked, made into
 * WebP (lib/serviceCoverImage) and stored as a new file. Nothing on the
 * site changes yet: the cover takes it only when it is saved
 * (PUT /api/services/covers/<slug>), which also deletes the files no longer
 * used, this one too if it never is.
 *
 * Form fields: slug, slot (desktop | mobile), file.
 * Answer: { url, ogUrl, width, height, bytes, source: { width, height, format } }.
 */
export async function POST(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: 'Нужно войти в админку.' }, { status: 401 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Ожидалась форма с файлом.' }, { status: 400 })
  }
  const slug = String(form.get('slug') ?? '')
  const slot = String(form.get('slot') ?? '') as CoverSlot
  const file = form.get('file')
  if (!isServiceSlug(slug)) return NextResponse.json({ error: 'Нет такой услуги.' }, { status: 400 })
  if (slot !== 'desktop' && slot !== 'mobile') return NextResponse.json({ error: 'Нет такого слота.' }, { status: 400 })
  if (!(file instanceof File)) return NextResponse.json({ error: 'Нет файла.' }, { status: 400 })
  const problem = coverFileProblem(file)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  try {
    const out = await processCover(Buffer.from(await file.arrayBuffer()), slot)
    const stamp = Date.now()
    const url = await putCoverFile(slug, coverFileName(slot, stamp), out.webp, 'image/webp')
    const ogUrl = out.og ? await putCoverFile(slug, coverFileName('og', stamp), out.og, 'image/jpeg') : null
    return NextResponse.json({ url, ogUrl, width: out.width, height: out.height, bytes: out.webp.length, source: out.source })
  } catch (err) {
    if (err instanceof CoverImageError) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[covers] upload failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Не удалось обработать или сохранить файл. Попробуйте ещё раз.' }, { status: 500 })
  }
}
