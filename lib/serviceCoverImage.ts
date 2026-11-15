import sharp from 'sharp'
import { COVER_OG, COVER_SPECS, type CoverSlot } from './serviceCoverSpec'

/** A picture that cannot be used as a cover; the message is for the admin. */
export class CoverImageError extends Error {}

export interface ProcessedCover {
  /** The picture as the page shows it: WebP, quality 80, no wider than the slot's maximum. */
  webp: Buffer
  width: number
  height: number
  /** For the desktop picture, the 1200×630 JPEG cut from its middle for link previews; else null. */
  og: Buffer | null
  /** The upload as it came, turned upright: what the size warnings were about. */
  source: { width: number; height: number; format: string }
}

const FORMATS = new Set(['jpeg', 'png', 'webp'])

/**
 * Make an uploaded picture into a cover: turned upright by its EXIF
 * orientation, scaled down (never up) to the slot's width, WebP at quality
 * 80. Camera data (EXIF, GPS) is not carried over. The size warnings are
 * the admin's to accept; here only what cannot be a picture is refused.
 */
export async function processCover(input: Buffer, slot: CoverSlot): Promise<ProcessedCover> {
  let meta: sharp.Metadata
  try {
    meta = await sharp(input).metadata()
  } catch {
    throw new CoverImageError('Не удалось прочитать изображение: файл повреждён или это не картинка.')
  }
  if (!meta.format || !FORMATS.has(meta.format) || !meta.width || !meta.height) {
    throw new CoverImageError('Нужен JPG, PNG или WebP.')
  }
  // EXIF orientations 5–8 are a quarter turn: the sides swap once upright.
  const turned = (meta.orientation ?? 1) >= 5
  const source = {
    width: turned ? meta.height : meta.width,
    height: turned ? meta.width : meta.height,
    format: meta.format,
  }

  const { data: webp, info } = await sharp(input)
    .rotate()
    .resize({ width: COVER_SPECS[slot].maxWidth, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true })

  const og = slot === 'desktop'
    ? await sharp(input)
      .rotate()
      .resize(COVER_OG.width, COVER_OG.height, { fit: 'cover', position: 'centre' })
      // JPEG has no transparency: a see-through PNG goes onto the page's own background.
      .flatten({ background: '#F5F4F0' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer()
    : null

  return { webp, width: info.width, height: info.height, og, source }
}
