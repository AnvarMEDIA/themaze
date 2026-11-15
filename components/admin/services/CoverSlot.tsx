'use client'

import { useCallback, useState } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { COVER_SPECS, type CoverSlot as Slot } from '@/lib/serviceCoverSpec'
import { checkCoverFile, fitForSending, uploadCover, type CoverCheck, type UploadedCover } from './coverClient'

/**
 * One of a cover's two pictures (Admin → Услуги → <service>): the picture
 * in its frame (3.2:1 or 4:3, as the page shows it), dropped or chosen,
 * replaced or removed. A picture off the recommended size is described with
 * its own numbers and goes on only when the admin says so. What is uploaded
 * here waits for «Сохранить».
 */

const button = 'inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-[13px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-[#C8FF47]/60 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50'
export const primaryButton = `${button} bg-[#C8FF47] text-[#0A0A0A] hover:bg-[#F0EEE6]`
export const quietButton = `${button} border border-[#2A2A2A] text-[#ccc] hover:border-[#444] hover:text-white`

const ru = (n: number) => n.toLocaleString('ru-RU')

export function CoverSlot({ slug, slot, url, unsaved, note, onUploaded, onRemove, onBusyChange }: {
  slug: string
  slot: Slot
  /** The picture shown: saved, or uploaded and waiting for «Сохранить». */
  url: string | null
  /** Shown when the picture differs from the saved one. */
  unsaved: string | null
  /** What having (or not having) this picture means for the page. */
  note?: string
  onUploaded: (uploaded: UploadedCover) => void
  onRemove: () => void
  /** While a picture is being checked or sent, the cover is not to be saved. */
  onBusyChange?: (busy: boolean) => void
}) {
  const spec = COVER_SPECS[slot]
  const [busy, setBusyState] = useState<'checking' | 'uploading' | null>(null)
  const setBusy = useCallback((next: 'checking' | 'uploading' | null) => {
    setBusyState(next)
    onBusyChange?.(next !== null)
  }, [onBusyChange])
  const [error, setError] = useState('')
  // A picture off the recommended size, held until the admin decides.
  const [pending, setPending] = useState<{ file: File; check: CoverCheck } | null>(null)

  const send = useCallback(async (file: File, check: CoverCheck) => {
    setPending(null)
    setBusy('uploading')
    try {
      const ready = await fitForSending(file, slot, check)
      onUploaded(await uploadCover(slug, slot, ready))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить.')
    } finally {
      setBusy(null)
    }
  }, [slug, slot, onUploaded, setBusy])

  const take = useCallback(async (file: File) => {
    setError('')
    setPending(null)
    setBusy('checking')
    let check: CoverCheck
    try {
      check = await checkCoverFile(file, slot)
    } catch (err) {
      setBusy(null)
      setError(err instanceof Error ? err.message : 'Файл не подходит.')
      return
    }
    setBusy(null)
    if (check.issues.length) setPending({ file, check })
    else void send(file, check)
  }, [slot, send, setBusy])

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    if (accepted[0]) void take(accepted[0])
    else if (rejected[0]) setError('Нужен JPG, PNG или WebP, один файл.')
  }, [take])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] },
    multiple: false,
    noClick: true,
    noKeyboard: true,
    disabled: !!busy,
  })

  const remove = () => {
    if (window.confirm(`Удалить фото «${spec.label}»? С сайта оно уйдёт после «Сохранить».`)) {
      setError('')
      setPending(null)
      onRemove()
    }
  }

  return (
    <section aria-label={spec.label} className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-[15px] font-semibold text-white">{spec.label}</h3>
        <p className="text-[12px] text-[#8A8A8A]">
          рекомендуется {spec.width}×{spec.height} px · {slot === 'desktop' ? '3,2:1' : '4:3'}
        </p>
      </div>

      {/* The frame is the drop target, filled or not. */}
      <div
        {...getRootProps()}
        className={`relative overflow-hidden rounded-xl border bg-[#111] transition-colors duration-150 ${
          isDragActive ? 'border-[#C8FF47]' : url ? 'border-[#1E1E1E]' : 'border-dashed border-[#2A2A2A]'
        }`}
        style={{ aspectRatio: spec.aspect }}
      >
        <input {...getInputProps()} aria-label={`Файл: ${spec.label}`} />
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center">
            <p className="text-[13px] text-[#bbb]">Перетащите фото сюда</p>
            <p className="text-[11px] text-[#6B6B6B]">JPG, PNG или WebP, до 8 МБ</p>
          </div>
        )}
        {(isDragActive || busy) && (
          <div className="absolute inset-0 grid place-items-center bg-[#080808]/75 text-[13px] font-semibold text-white">
            {busy === 'uploading' ? 'Загружаем и обрабатываем…' : busy === 'checking' ? 'Проверяем…' : 'Отпустите, чтобы загрузить'}
          </div>
        )}
      </div>

      {pending && (
        <div role="alert" className="rounded-xl border border-[#E2B04A]/40 bg-[#E2B04A]/10 p-3 text-[13px] text-[#F3D79A]">
          <p className="font-semibold text-white">
            Фото {ru(pending.check.width)}×{ru(pending.check.height)} px не по размеру
          </p>
          <ul className="mt-1 list-disc pl-5 text-[12px] leading-relaxed">
            {pending.check.issues.map((issue) => <li key={issue}>{issue}</li>)}
          </ul>
          <p className="mt-1 text-[12px]">На сайте оно всё равно заполнит рамку, обрезанное по центру.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={primaryButton} onClick={() => void send(pending.file, pending.check)}>Загрузить всё равно</button>
            <button type="button" className={quietButton} onClick={() => setPending(null)}>Отмена</button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-[13px] text-[#F2B8A6]">{error}</p>}

      {/* While a picture off its size waits for a decision, only its own two buttons are offered. */}
      <div className={`flex flex-wrap items-center gap-2 ${pending ? 'hidden' : ''}`}>
        {url ? (
          <>
            <button type="button" className={quietButton} onClick={open} disabled={!!busy}>Заменить</button>
            <button type="button" className={`${quietButton} hover:!border-[#E27A5C]/60 hover:!text-[#F2B8A6]`} onClick={remove} disabled={!!busy}>Удалить</button>
          </>
        ) : (
          <button type="button" className={primaryButton} onClick={open} disabled={!!busy}>Загрузить</button>
        )}
        {unsaved && <span className="text-[12px] text-[#C8FF47]">{unsaved}</span>}
      </div>
      {note && <p className="text-[12px] leading-relaxed text-[#8A8A8A]">{note}</p>}
    </section>
  )
}
