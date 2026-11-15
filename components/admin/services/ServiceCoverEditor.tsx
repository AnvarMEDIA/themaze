'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ServiceCover } from '@/lib/serviceCovers'
import { CoverSlot, primaryButton } from './CoverSlot'
import { saveCover, savedAt, type UploadedCover } from './coverClient'

/**
 * Admin → Услуги → <service>: the cover of a service page. Two pictures
 * and one alt text in each language (one <img> shows both pictures, so one
 * alt describes them). Every change waits for «Сохранить», which puts it
 * on the site at once and deletes the files no longer used.
 */

const input = 'mt-1 block w-full rounded-lg border border-[#252525] bg-[#111] px-3 py-2 text-[14px] text-white placeholder:text-[#555] transition-colors duration-150 focus:border-[#C8FF47]/60 focus:outline-none'

export function ServiceCoverEditor({ slug, titles, defaultAlt, cover }: {
  slug: string
  titles: { ru: string; en: string }
  defaultAlt: { ru: string; en: string }
  cover: ServiceCover
}) {
  const router = useRouter()
  const [saved, setSaved] = useState(cover)
  const [desktop, setDesktop] = useState(cover.coverDesktop)
  const [mobile, setMobile] = useState(cover.coverMobile)
  const altOf = (c: ServiceCover) => ({ ru: c.coverAlt.ru || defaultAlt.ru, en: c.coverAlt.en || defaultAlt.en })
  const [alt, setAlt] = useState(() => altOf(cover))
  const [busySlots, setBusySlots] = useState({ desktop: false, mobile: false })
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)

  const savedAlt = altOf(saved)
  const dirty = desktop !== saved.coverDesktop || mobile !== saved.coverMobile
    || alt.ru.trim() !== savedAlt.ru || alt.en.trim() !== savedAlt.en
  const busy = busySlots.desktop || busySlots.mobile

  // Leaving with changes not saved: the browser asks first.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const changed = () => setStatus(null)
  const onDesktop = useCallback((u: UploadedCover) => { setDesktop(u.url); setStatus(null) }, [])
  const onMobile = useCallback((u: UploadedCover) => { setMobile(u.url); setStatus(null) }, [])
  const desktopBusy = useCallback((b: boolean) => setBusySlots((s) => ({ ...s, desktop: b })), [])
  const mobileBusy = useCallback((b: boolean) => setBusySlots((s) => ({ ...s, mobile: b })), [])

  const save = async () => {
    setSaving(true)
    setStatus(null)
    try {
      // The default text is kept as "the default": it then follows the service's name.
      const own = (text: string, fallback: string) => (text.trim() === fallback ? '' : text.trim())
      const next = await saveCover(slug, {
        coverDesktop: desktop,
        coverMobile: mobile,
        coverAlt: { ru: own(alt.ru, defaultAlt.ru), en: own(alt.en, defaultAlt.en) },
      })
      setSaved(next)
      setAlt(altOf(next))
      setStatus({ ok: true, text: next.coverDesktop ? 'Сохранено. Страница услуги уже показывает новую обложку.' : 'Сохранено. На странице услуги обложки нет.' })
      router.refresh()
    } catch (err) {
      setStatus({ ok: false, text: err instanceof Error ? err.message : 'Не удалось сохранить.' })
    } finally {
      setSaving(false)
    }
  }

  const unsaved = (now: string | null, before: string | null) =>
    now === before ? null : now ? 'Новое фото · не сохранено' : 'Удалено · не сохранено'

  return (
    <div>
      <Link href="/admin/services" className="text-[13px] text-[#8A8A8A] transition-colors duration-150 hover:text-white">← Услуги</Link>
      <header className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{titles.ru}</h1>
          <p className="mt-1 text-sm text-[#8A8A8A]">Обложка страницы услуги · {titles.en}</p>
        </div>
        <p className="text-[13px] text-[#8A8A8A]">
          Открыть страницу:{' '}
          <a href={`/ru/services/${slug}`} target="_blank" rel="noopener noreferrer" className="text-white underline-offset-4 hover:underline">RU</a>
          {' · '}
          <a href={`/services/${slug}`} target="_blank" rel="noopener noreferrer" className="text-white underline-offset-4 hover:underline">EN</a>
        </p>
      </header>

      <section className="rounded-2xl border border-[#1E1E1E] bg-[#0D0D0D] p-5" aria-labelledby="cover-heading">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="cover-heading" className="text-[15px] font-semibold text-white">Обложка</h2>
          {saved.coverUpdatedAt && <p className="text-[12px] text-[#6B6B6B]">сохранено {savedAt(saved.coverUpdatedAt)}</p>}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
          <CoverSlot
            slug={slug}
            slot="desktop"
            url={desktop}
            unsaved={unsaved(desktop, saved.coverDesktop)}
            note={desktop
              ? 'Это фото показывается на компьютере и уходит в превью ссылки на страницу.'
              : 'Без десктопного фото обложки на странице нет — ни на компьютере, ни на телефоне.'}
            onUploaded={onDesktop}
            onRemove={() => { setDesktop(null); changed() }}
            onBusyChange={desktopBusy}
          />
          <CoverSlot
            slug={slug}
            slot="mobile"
            url={mobile}
            unsaved={unsaved(mobile, saved.coverMobile)}
            note={!mobile && desktop
              ? 'Нет мобильного фото — на телефоне покажется десктопное, обрезанное до 4:3.'
              : mobile && !desktop
                ? 'Пока нет десктопного фото, мобильное на сайте не показывается.'
                : undefined}
            onUploaded={onMobile}
            onRemove={() => { setMobile(null); changed() }}
            onBusyChange={mobileBusy}
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-[12px] text-[#8A8A8A]">
            Alt (RU)
            <input className={input} value={alt.ru} maxLength={300} placeholder={defaultAlt.ru}
              onChange={(e) => { setAlt((a) => ({ ...a, ru: e.target.value })); changed() }} />
          </label>
          <label className="text-[12px] text-[#8A8A8A]">
            Alt (EN)
            <input className={input} value={alt.en} maxLength={300} placeholder={defaultAlt.en}
              onChange={(e) => { setAlt((a) => ({ ...a, en: e.target.value })); changed() }} />
          </label>
        </div>
        <p className="mt-2 text-[12px] text-[#6B6B6B]">
          Один текст на обе версии: на странице это одна картинка. Пустое поле — «{defaultAlt.ru}».
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#161616] pt-5">
          <button type="button" className={primaryButton} onClick={() => void save()} disabled={!dirty || saving || busy}>
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
          {status
            ? <p role="status" className={`text-[13px] ${status.ok ? 'text-[#B5E26B]' : 'text-[#F2B8A6]'}`}>{status.text}</p>
            : dirty && <p className="text-[13px] text-[#8A8A8A]">Есть несохранённые изменения.</p>}
        </div>
      </section>
    </div>
  )
}
