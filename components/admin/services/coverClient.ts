import imageCompression from 'browser-image-compression'
import { COVER_SPECS, coverFileProblem, coverSizeIssues, type CoverSlot } from '@/lib/serviceCoverSpec'
import type { ServiceCover } from '@/lib/serviceCovers'

/**
 * The admin's side of a cover upload (Admin → Услуги): look at a file
 * before it goes, make it fit what Vercel accepts, send it, save.
 */

export interface CoverCheck { width: number; height: number; issues: string[] }

/** The picture's size upright: browsers apply its EXIF orientation, as the server does. */
async function readImageSize(file: File): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    const src = URL.createObjectURL(file)
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(src) }
    img.onerror = () => { reject(new Error('unreadable')); URL.revokeObjectURL(src) }
    img.src = src
  })
}

/**
 * A file looked at before it is sent. Its type or weight refuses it
 * (thrown, in words); its size only warns: `issues`, for the admin to
 * accept or not.
 */
export async function checkCoverFile(file: File, slot: CoverSlot): Promise<CoverCheck> {
  const problem = coverFileProblem(file)
  if (problem) throw new Error(problem)
  let size: { width: number; height: number }
  try {
    size = await readImageSize(file)
  } catch {
    throw new Error('Не удалось прочитать изображение: файл повреждён или это не картинка.')
  }
  return { ...size, issues: coverSizeIssues(slot, size.width, size.height) }
}

// Vercel accepts a request of up to 4.5 MB.
const SEND_LIMIT = 4 * 1024 * 1024

/**
 * A file over 4 MB is first scaled to the slot's width at high quality
 * (JPEG 92%): sent as it is, Vercel would refuse it. The server makes the
 * WebP all the same, so nothing is lost that the page would show.
 */
export async function fitForSending(file: File, slot: CoverSlot, size: { width: number; height: number }): Promise<File> {
  if (file.size <= SEND_LIMIT) return file
  const width = Math.min(size.width, COVER_SPECS[slot].maxWidth)
  const longest = Math.max(width, Math.round((width * size.height) / size.width))
  const out = await imageCompression(file, {
    maxSizeMB: 3.8,
    maxWidthOrHeight: longest,
    initialQuality: 0.92,
    fileType: 'image/jpeg',
    useWebWorker: true,
  })
  if (out.size > SEND_LIMIT) throw new Error('Файл слишком тяжёлый даже после уменьшения: сохраните его в JPG и попробуйте снова.')
  return new File([out], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
}

export interface UploadedCover { url: string; ogUrl: string | null; width: number; height: number }

async function answer<T>(res: Response, fallback: string): Promise<T> {
  const body = await res.json().catch(() => ({})) as T & { error?: string }
  if (res.status === 401) throw new Error('Сессия админки закончилась — войдите заново.')
  if (res.status === 413) throw new Error('Файл слишком большой для отправки.')
  if (!res.ok) throw new Error(body.error || `${fallback} (ошибка ${res.status}).`)
  return body
}

/** Send one picture; it is processed and stored, but on the site only once the cover is saved. */
export async function uploadCover(slug: string, slot: CoverSlot, file: File): Promise<UploadedCover> {
  const form = new FormData()
  form.append('slug', slug)
  form.append('slot', slot)
  form.append('file', file)
  let res: Response
  try {
    res = await fetch('/api/services/covers/upload', { method: 'POST', body: form })
  } catch {
    throw new Error('Нет связи с сайтом. Проверьте интернет и повторите.')
  }
  return answer<UploadedCover>(res, 'Не удалось загрузить')
}

export interface CoverDraft {
  coverDesktop: string | null
  coverMobile: string | null
  coverAlt: { ru: string; en: string }
}

/** Save a service's cover as it is now on the screen. */
export async function saveCover(slug: string, draft: CoverDraft): Promise<ServiceCover> {
  let res: Response
  try {
    res = await fetch(`/api/services/covers/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
  } catch {
    throw new Error('Нет связи с сайтом. Проверьте интернет и повторите.')
  }
  return (await answer<{ cover: ServiceCover }>(res, 'Не удалось сохранить')).cover
}

/** «15.11.2026, 19:40» on the studio's clock. */
export function savedAt(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('ru-RU', {
    timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
