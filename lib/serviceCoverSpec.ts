/**
 * The two pictures a service page's cover is made of, and what each should
 * be: shared by the admin (to warn before an upload) and the server (to
 * process one). Client-safe: nothing is imported.
 *
 * Desktop 1913×822 (2.33:1, the studio's own photos), mobile 1080×810
 * (4:3). A picture outside the recommended size can still be used, after a
 * warning: the page crops it with object-fit, so it fills its frame either
 * way.
 */

export type CoverSlot = 'desktop' | 'mobile'
export const COVER_SLOTS: CoverSlot[] = ['desktop', 'mobile']

export interface CoverSpec {
  label: string
  /** The recommended size, shown under the preview. */
  width: number
  height: number
  /** The frame the admin's preview shows it in, as CSS aspect-ratio. */
  aspect: string
  /** The same, as the admin reads it. */
  ratioLabel: string
  minWidth: number
  /** Width to height, the range a picture is expected in. */
  ratio: [number, number]
  /** The widest the stored file is made: a wider upload is scaled down, a narrower one left as it is. */
  maxWidth: number
}

export const COVER_SPECS: Record<CoverSlot, CoverSpec> = {
  desktop: { label: 'Десктоп', width: 1913, height: 822, aspect: '1913 / 822', ratioLabel: '2,33:1', minWidth: 1900, ratio: [2.1, 2.6], maxWidth: 2560 },
  mobile:  { label: 'Мобайл',  width: 1080, height: 810, aspect: '4 / 3',      ratioLabel: '4:3',    minWidth: 750,  ratio: [1.2, 1.45], maxWidth: 1080 },
}

export const COVER_MAX_BYTES = 8 * 1024 * 1024
export const COVER_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const COVER_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const

/** The link-preview picture made from the desktop cover (og:image). */
export const COVER_OG = { width: 1200, height: 630 }

const ru = (n: number, digits = 2) => n.toFixed(digits).replace(/\.?0+$/, '').replace('.', ',')

/** What is off about a picture's size for its slot, in words; empty when it fits. */
export function coverSizeIssues(slot: CoverSlot, width: number, height: number): string[] {
  const spec = COVER_SPECS[slot]
  const issues: string[] = []
  if (width < spec.minWidth) issues.push(`ширина ${width} px, нужно от ${spec.minWidth} px`)
  const ratio = width / height
  if (!(ratio >= spec.ratio[0] && ratio <= spec.ratio[1])) {
    issues.push(`соотношение сторон ${ru(ratio)}:1, нужно ${ru(spec.ratio[0])}–${ru(spec.ratio[1])}:1`)
  }
  return issues
}

/** A file's own complaint before its size is even looked at: its type or weight; null when fine. */
export function coverFileProblem(file: { name: string; type: string; size: number }): string | null {
  const ext = file.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? ''
  const typeOk = (COVER_MIME_TYPES as readonly string[]).includes(file.type) || (COVER_EXTENSIONS as readonly string[]).includes(ext)
  if (!typeOk) return 'Нужен JPG, PNG или WebP.'
  if (file.size > COVER_MAX_BYTES) return `Файл ${ru(file.size / 1024 / 1024, 1)} МБ, можно до 8 МБ.`
  return null
}

/**
 * The service and the slot a file is named for, for loading many at once:
 * `<slug>-d.jpg` is the desktop picture, `<slug>-m.webp` the mobile one.
 */
export function coverFileTarget(name: string, slugs: readonly string[]): { slug: string; slot: CoverSlot } | null {
  const m = name.toLowerCase().match(/^(.+)-([dm])\.(jpe?g|png|webp)$/)
  if (!m || !slugs.includes(m[1])) return null
  return { slug: m[1], slot: m[2] === 'd' ? 'desktop' : 'mobile' }
}
