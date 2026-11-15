'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { SERVICE_SLUGS } from '@/lib/services'
import { COVER_SPECS, coverFileTarget, type CoverSlot } from '@/lib/serviceCoverSpec'
import type { ServiceCover } from '@/lib/serviceCovers'
import { primaryButton, quietButton } from './CoverSlot'
import { checkCoverFile, fitForSending, saveCover, savedAt, uploadCover, type CoverCheck } from './coverClient'

/**
 * Admin → Услуги: every service's cover at a glance, both pictures, so a
 * missing one shows; and many pictures loaded at once, each going where its
 * name says (<slug>-d.jpg for desktop, <slug>-m.jpg for mobile).
 */

export interface CoverItem { slug: string; title: string; cover: ServiceCover }

type RowState = 'ready' | 'warning' | 'error' | 'uploading' | 'saved' | 'failed'
interface Row {
  id: number
  file: File
  target: { slug: string; slot: CoverSlot } | null
  check?: CoverCheck
  state: RowState
  message: string
}

function status(cover: ServiceCover): { text: string; tone: string } {
  if (cover.coverDesktop && cover.coverMobile) return { text: 'Готово', tone: 'text-[#B5E26B] border-[#B5E26B]/30' }
  if (cover.coverDesktop) return { text: 'Нет мобильного', tone: 'text-[#F3D79A] border-[#E2B04A]/40' }
  if (cover.coverMobile) return { text: 'Нет десктопного', tone: 'text-[#F2B8A6] border-[#E27A5C]/40' }
  return { text: 'Нет обложки', tone: 'text-[#F2B8A6] border-[#E27A5C]/40' }
}

function Thumb({ url, slot, missing }: { url: string | null; slot: CoverSlot; missing: string }) {
  return (
    <div>
      <div className="relative overflow-hidden rounded-lg border border-[#1E1E1E] bg-[#111]" style={{ aspectRatio: COVER_SPECS[slot].aspect }}>
        {url
          ? <Image src={url} alt="" fill sizes="(min-width: 1280px) 22vw, (min-width: 640px) 35vw, 70vw" className="object-cover" />
          : <span className="absolute inset-0 grid place-items-center border border-dashed border-[#2A2A2A] rounded-lg px-1 text-center text-[11px] text-[#6B6B6B]">{missing}</span>}
      </div>
      <p className="mt-1 text-[11px] text-[#6B6B6B]">{COVER_SPECS[slot].label}</p>
    </div>
  )
}

let nextId = 0

export function ServiceCoversOverview({ items }: { items: CoverItem[] }) {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [phase, setPhase] = useState<'idle' | 'checking' | 'review' | 'running' | 'done'>('idle')
  const [progress, setProgress] = useState('')

  const withCover = items.filter((i) => i.cover.coverDesktop).length
  const noMobile = items.filter((i) => i.cover.coverDesktop && !i.cover.coverMobile).length
  const titleOf = (slug: string) => items.find((i) => i.slug === slug)?.title ?? slug
  const update = (id: number, patch: Partial<Row>) => setRows((all) => all.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const onDrop = useCallback(async (files: File[]) => {
    if (!files.length) return
    setPhase('checking')
    const targets = files.map((file) => ({ file, target: coverFileTarget(file.name, SERVICE_SLUGS) }))
    const count = new Map<string, number>()
    for (const { target } of targets) if (target) count.set(`${target.slug}:${target.slot}`, (count.get(`${target.slug}:${target.slot}`) ?? 0) + 1)
    const checked = await Promise.all(targets.map(async ({ file, target }): Promise<Row> => {
      const id = nextId++
      if (!target) return { id, file, target, state: 'error', message: 'Имя не подходит: нужно <slug>-d.jpg (десктоп) или <slug>-m.jpg (мобайл).' }
      if ((count.get(`${target.slug}:${target.slot}`) ?? 0) > 1) return { id, file, target, state: 'error', message: 'Два файла на одно место — оставьте один.' }
      try {
        const check = await checkCoverFile(file, target.slot)
        return check.issues.length
          ? { id, file, target, check, state: 'warning', message: `${check.width}×${check.height} px: ${check.issues.join('; ')}` }
          : { id, file, target, check, state: 'ready', message: `${check.width}×${check.height} px` }
      } catch (err) {
        return { id, file, target, state: 'error', message: err instanceof Error ? err.message : 'Файл не подходит.' }
      }
    }))
    setRows(checked)
    setPhase('review')
  }, [])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (files) => void onDrop(files),
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] },
    multiple: true,
    noClick: true,
    noKeyboard: true,
    disabled: phase === 'checking' || phase === 'running',
  })

  const usable = rows.filter((r) => r.state === 'ready' || r.state === 'warning')
  const warnings = rows.filter((r) => r.state === 'warning').length

  const run = async () => {
    setPhase('running')
    const bySlug = new Map<string, Row[]>()
    for (const r of usable) bySlug.set(r.target!.slug, [...(bySlug.get(r.target!.slug) ?? []), r])
    let done = 0
    for (const [slug, group] of Array.from(bySlug)) {
      const uploaded: Partial<Record<CoverSlot, string>> = {}
      for (const row of group) {
        setProgress(`Загружаем ${++done} из ${usable.length}: ${row.file.name}`)
        update(row.id, { state: 'uploading', message: 'Загружаем…' })
        try {
          const file = await fitForSending(row.file, row.target!.slot, row.check!)
          uploaded[row.target!.slot] = (await uploadCover(slug, row.target!.slot, file)).url
          update(row.id, { message: 'Загружено, сохраняем…' })
        } catch (err) {
          update(row.id, { state: 'failed', message: err instanceof Error ? err.message : 'Не удалось загрузить.' })
        }
      }
      if (!uploaded.desktop && !uploaded.mobile) continue
      // Whatever this service already has stays, except what was just replaced.
      const current = items.find((i) => i.slug === slug)!.cover
      try {
        await saveCover(slug, {
          coverDesktop: uploaded.desktop ?? current.coverDesktop,
          coverMobile: uploaded.mobile ?? current.coverMobile,
          coverAlt: current.coverAlt,
        })
        for (const row of group) if (uploaded[row.target!.slot]) update(row.id, { state: 'saved', message: 'Сохранено' })
      } catch (err) {
        for (const row of group) if (uploaded[row.target!.slot]) update(row.id, { state: 'failed', message: err instanceof Error ? err.message : 'Не удалось сохранить.' })
      }
    }
    setProgress('')
    setPhase('done')
    router.refresh()
  }

  const reset = () => { setRows([]); setPhase('idle'); setProgress('') }
  const tone: Record<RowState, string> = {
    ready: 'text-[#bbb]', warning: 'text-[#F3D79A]', error: 'text-[#F2B8A6]', uploading: 'text-[#bbb]', saved: 'text-[#B5E26B]', failed: 'text-[#F2B8A6]',
  }
  const savedCount = rows.filter((r) => r.state === 'saved').length
  const failedCount = rows.filter((r) => r.state === 'failed').length

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Услуги</h1>
        <p className="mt-1 text-sm text-[#8A8A8A]">
          Обложки страниц услуг · с обложкой {withCover} из {items.length}
          {noMobile > 0 && ` · без мобильной версии ${noMobile}`}
        </p>
      </header>

      {/* Many at once */}
      <section
        {...getRootProps()}
        aria-label="Загрузить пачкой"
        className={`mb-6 rounded-2xl border p-5 transition-colors duration-150 ${isDragActive ? 'border-[#C8FF47] bg-[#C8FF47]/[0.04]' : 'border-dashed border-[#2A2A2A] bg-[#0D0D0D]'}`}
      >
        <input {...getInputProps()} aria-label="Файлы обложек" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-white">Загрузить пачкой</h2>
            <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-[#8A8A8A]">
              Перетащите сюда сразу все фото с именами <code className="text-[#ccc]">&lt;slug&gt;-d.jpg</code> (десктоп)
              и <code className="text-[#ccc]">&lt;slug&gt;-m.jpg</code> (мобайл) — разложим по услугам и сохраним.
              Slug-и: {SERVICE_SLUGS.join(', ')}.
            </p>
          </div>
          {phase === 'idle' || phase === 'done'
            ? <button type="button" className={quietButton} onClick={open}>Выбрать файлы</button>
            : null}
        </div>

        {phase === 'checking' && <p className="mt-4 text-[13px] text-[#bbb]">Проверяем файлы…</p>}

        {rows.length > 0 && phase !== 'checking' && (
          <div className="mt-4" onClick={(e) => e.stopPropagation()}>
            <ul className="divide-y divide-[#161616] rounded-xl border border-[#1E1E1E]">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2 text-[13px]">
                  <span className="min-w-0 max-w-full truncate font-medium text-white">{r.file.name}</span>
                  {r.target && <span className="text-[#8A8A8A]">→ {titleOf(r.target.slug)} · {COVER_SPECS[r.target.slot].label}</span>}
                  <span className={`basis-full sm:basis-auto ${tone[r.state]}`}>{r.message}</span>
                </li>
              ))}
            </ul>

            {phase === 'review' && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {usable.length > 0 && (
                  <button type="button" className={primaryButton} onClick={() => void run()}>
                    {warnings ? `Загрузить всё равно (${usable.length})` : `Загрузить (${usable.length})`}
                  </button>
                )}
                <button type="button" className={quietButton} onClick={reset}>Отмена</button>
                {warnings > 0 && (
                  <p className="text-[12px] text-[#F3D79A]">
                    {warnings} не по размеру: на сайте их обрежет по центру.
                  </p>
                )}
              </div>
            )}
            {phase === 'running' && <p role="status" className="mt-4 text-[13px] text-[#bbb]">{progress}</p>}
            {phase === 'done' && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <p role="status" className={`text-[13px] ${failedCount ? 'text-[#F2B8A6]' : 'text-[#B5E26B]'}`}>
                  Сохранено фото: {savedCount}{failedCount ? ` · не получилось: ${failedCount}` : ''}
                </p>
                <button type="button" className={quietButton} onClick={reset}>Готово</button>
              </div>
            )}
          </div>
        )}
      </section>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(({ slug, title, cover }) => {
          const s = status(cover)
          return (
            <li key={slug}>
              <Link
                href={`/admin/services/${slug}`}
                className="block rounded-2xl border border-[#1E1E1E] bg-[#0D0D0D] p-4 outline-none transition-[border-color,transform] duration-150 ease-out hover:border-[#333] focus-visible:ring-2 focus-visible:ring-[#C8FF47]/60 active:scale-[0.99]"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="truncate text-[15px] font-semibold text-white">{title}</h3>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${s.tone}`}>{s.text}</span>
                </div>
                <div className="mt-3 grid grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)] items-end gap-2">
                  <Thumb url={cover.coverDesktop} slot="desktop" missing="нет фото" />
                  <Thumb url={cover.coverMobile} slot="mobile" missing={cover.coverDesktop ? 'будет десктоп' : 'нет фото'} />
                </div>
                <p className="mt-2 text-[11px] text-[#6B6B6B]">{cover.coverUpdatedAt ? `сохранено ${savedAt(cover.coverUpdatedAt)}` : slug}</p>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
