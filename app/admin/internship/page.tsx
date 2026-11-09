'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  INTERN_STATUSES, INTERN_STATUS_LABELS, displayUrl, telegramUsername,
  type InternApplication, type InternshipSettings, type InternStatus,
} from '@/lib/internship'
import { formatPhoneNumberIntl } from 'react-phone-number-input'
import { pluralRu } from '@/lib/utils'

/**
 * The internship: the intake switch and the candidates.
 *
 * A candidate moves through statuses rather than read/unread: "new" is the
 * inbox, and every later status is a decision someone made. The note is the
 * studio's own memory of the person, kept next to what they sent.
 */

type Filter = 'all' | InternStatus

// One colour per status, so a long list can be read at a glance.
const STATUS_TONE: Record<InternStatus, string> = {
  new:       'bg-[#C8FF47]/15 text-[#C8FF47]',
  test:      'bg-[#E0A03A]/15 text-[#E0A03A]',
  interview: 'bg-[#5AB0FF]/15 text-[#5AB0FF]',
  intern:    'bg-[#B48CFF]/15 text-[#B48CFF]',
  hired:     'bg-[#3DDC97]/15 text-[#3DDC97]',
  rejected:  'bg-[#2A2A2A] text-[#777]',
}

const FILTER_LABELS: Record<Filter, string> = {
  all:       'Все',
  new:       'Новые',
  test:      'Тестовое',
  interview: 'Собеседование',
  intern:    'Стажёры',
  hired:     'В штате',
  rejected:  'Отказ',
}

function fmtDate(iso: string, withTime = true) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'Asia/Tashkent',
  }).format(new Date(iso))
}

function fmtDay(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, d)))
}

function StatusBadge({ status }: { status: InternStatus }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_TONE[status]}`}>
      {INTERN_STATUS_LABELS[status]}
    </span>
  )
}

export default function AdminInternshipPage() {
  const [settings, setSettings] = useState<InternshipSettings | null>(null)
  const [items,    setItems]    = useState<InternApplication[]>([])
  const [loading,  setLoading]  = useState(true)
  const [toggling, setToggling] = useState(false)
  const [filter,   setFilter]   = useState<Filter>('all')
  const [query,    setQuery]    = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/internship', { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const data = await res.json() as { settings: InternshipSettings; applications: InternApplication[] }
      setSettings(data.settings)
      setItems(data.applications)
    } catch {
      toast.error('Не удалось загрузить заявки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const toggleOpen = async () => {
    if (!settings || toggling) return
    const next = !settings.open
    if (!next && !confirm('Закрыть набор? Ссылка исчезнет из меню, форма перестанет принимать заявки, страница скроется из поиска.')) return
    setToggling(true)
    try {
      const res = await fetch('/api/internship', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ open: next }),
      })
      if (!res.ok) throw new Error()
      setSettings(await res.json())
      toast.success(next ? 'Набор открыт' : 'Набор закрыт')
    } catch {
      toast.error('Не удалось сохранить')
    } finally {
      setToggling(false)
    }
  }

  const patch = async (id: string, body: { status?: InternStatus; note?: string }) => {
    const before = items
    // Optimistic: the click shows at once; a failure puts it back.
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, ...body, note: body.note ?? a.note } : a)))
    try {
      const res = await fetch(`/api/internship/${encodeURIComponent(id)}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      const saved = await res.json() as InternApplication
      setItems((prev) => prev.map((a) => (a.id === id ? saved : a)))
      return true
    } catch {
      setItems(before)
      toast.error('Не удалось сохранить')
      return false
    }
  }

  const remove = async (a: InternApplication) => {
    if (!confirm(`Удалить заявку «${a.name}»? Это нельзя отменить.`)) return
    try {
      const res = await fetch(`/api/internship/${encodeURIComponent(a.id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setItems((prev) => prev.filter((x) => x.id !== a.id))
      setSelectedId(null)
      toast.success('Заявка удалена')
    } catch {
      toast.error('Не удалось удалить')
    }
  }

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: items.length, new: 0, test: 0, interview: 0, intern: 0, hired: 0, rejected: 0 }
    for (const a of items) c[a.status] += 1
    return c
  }, [items])

  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => items.filter((a) => {
    if (filter !== 'all' && a.status !== filter) return false
    if (!q) return true
    return [a.name, a.phone, a.email, a.telegram, a.city, a.portfolio, a.about, a.note]
      .some((v) => (v ?? '').toLowerCase().includes(q))
  }), [items, filter, q])

  const selected = items.find((a) => a.id === selectedId) ?? null

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1400px]">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Стажировка</h1>
          <p className="text-sm text-[#666] mt-1">Заявки кандидатов и набор на сайте.</p>
        </div>
        <a
          href="/ru/internship"
          target="_blank"
          rel="noreferrer"
          className="px-3 py-2 rounded-lg border border-[#2A2A2A] text-xs text-[#aaa] hover:text-white hover:border-[#444] transition-colors"
        >
          Открыть страницу ↗
        </a>
      </div>

      {/* ── Intake switch ────────────────────────────────────────────────── */}
      <div className="mb-8 rounded-xl border border-[#1E1E1E] bg-[#0D0D0D] p-4 sm:p-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${settings?.open ? 'bg-[#C8FF47]' : 'bg-[#444]'}`} />
            {settings ? (settings.open ? 'Набор открыт' : 'Набор закрыт') : '…'}
          </p>
          <p className="text-xs text-[#666] mt-1.5 leading-relaxed max-w-xl">
            {settings?.open
              ? `Ссылка «Стажировка» в меню и подвале, форма принимает заявки, вакансия видна в поиске Google. Открыт с ${fmtDay(settings.openedAt)}`
              : 'Ссылки в меню нет, форма не принимает заявки, страница скрыта от поиска. Открытие начнёт новый набор с сегодняшней датой.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!!settings?.open}
          aria-label="Набор на стажировку открыт"
          disabled={!settings || toggling}
          onClick={toggleOpen}
          className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors duration-150 disabled:opacity-50 ${
            settings?.open ? 'bg-[#C8FF47]' : 'bg-[#2A2A2A]'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-[#0A0A0A] transition-transform duration-150 ease-out ${
              settings?.open ? 'translate-x-[24px]' : 'translate-x-[4px]'
            }`}
          />
        </button>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
        <div className="flex gap-1 overflow-x-auto scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
          {(['all', ...INTERN_STATUSES] as Filter[]).map((f) => {
            const active = filter === f
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active ? 'bg-[#C8FF47]/10 text-[#C8FF47]' : 'text-[#666] hover:text-white'
                }`}
              >
                {FILTER_LABELS[f]} <span className="tabular-nums opacity-70">{counts[f]}</span>
              </button>
            )
          })}
        </div>
        <input
          type="search"
          placeholder="Поиск: имя, телефон, город, текст…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Поиск по заявкам"
          className="lg:ml-auto w-full lg:w-72 bg-[#111] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#444] focus:outline-none focus:border-[#C8FF47] transition-colors"
        />
      </div>

      {/* ── List + detail ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 items-start">
        <div className={`rounded-xl border border-[#1E1E1E] overflow-hidden ${selected ? 'hidden lg:block' : ''}`}>
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-[#141414] animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <p className="text-sm text-[#666]">
                {items.length === 0 ? 'Заявок пока нет.' : 'Ничего не найдено.'}
              </p>
              {items.length === 0 && (
                <p className="text-xs text-[#444] mt-1">Заявки с сайта появятся здесь и придут в Telegram.</p>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-[#1A1A1A] max-h-[70vh] overflow-y-auto">
              {filtered.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    className={`w-full text-left px-4 py-3.5 transition-colors hover:bg-[#111] ${
                      selectedId === a.id ? 'bg-[#111] shadow-[inset_2px_0_0_#C8FF47]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-sm font-medium text-white truncate">{a.name}</span>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="text-xs text-[#666] truncate">
                      {[a.city, displayUrl(a.portfolio)].filter(Boolean).join(' · ')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-[#444]">{fmtDate(a.createdAt)}</p>
                      {a.notifyError && (
                        <span className="text-[10px] text-[#E0A03A]" title={`Telegram: ${a.notifyError}`}>
                          ⚠ не пришло в Telegram
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={selected ? '' : 'hidden lg:block'}>
          {selected ? (
            <Detail
              key={selected.id}
              app={selected}
              onBack={() => setSelectedId(null)}
              onStatus={(status) => patch(selected.id, { status })}
              onNote={(note) => patch(selected.id, { note })}
              onDelete={() => remove(selected)}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-[#1E1E1E] py-24 text-center">
              <p className="text-sm text-[#444]">
                {items.length > 0
                  ? `${items.length} ${pluralRu(items.length, 'заявка', 'заявки', 'заявок')} · выберите кандидата`
                  : 'Здесь будет карточка кандидата'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── One candidate ───────────────────────────────────────────────────────── */

function Detail({
  app, onBack, onStatus, onNote, onDelete,
}: {
  app: InternApplication
  onBack: () => void
  onStatus: (s: InternStatus) => Promise<boolean>
  onNote: (note: string) => Promise<boolean>
  onDelete: () => void
}) {
  const [note, setNote] = useState(app.note ?? '')
  const [savingNote, setSavingNote] = useState(false)
  // Clicking "Save" blurs the textarea first, so both handlers fire in one
  // gesture; the refs make the second one see the first and stand down.
  const inFlight  = useRef(false)
  const savedNote = useRef((app.note ?? '').trim())
  const noteDirty = note.trim() !== (app.note ?? '').trim()
  const tg = telegramUsername(app.telegram)

  const saveNote = async () => {
    const next = note.trim()
    if (inFlight.current || next === savedNote.current) return
    inFlight.current = true
    setSavingNote(true)
    if (await onNote(next)) {
      savedNote.current = next
      toast.success('Заметка сохранена')
    }
    inFlight.current = false
    setSavingNote(false)
  }

  const contacts: Array<{ label: string; value: string; href?: string }> = [
    { label: 'Телефон', value: formatPhoneNumberIntl(app.phone) || app.phone, href: `tel:${app.phone}` },
    ...(app.telegram
      ? [{ label: 'Telegram', value: tg ? `@${tg}` : app.telegram, href: tg ? `https://t.me/${tg}` : undefined }]
      : []),
    ...(app.email ? [{ label: 'Email', value: app.email, href: `mailto:${app.email}` }] : []),
    ...(app.city ? [{ label: 'Город', value: app.city }] : []),
  ]

  return (
    <div className="rounded-xl border border-[#1E1E1E] bg-[#0B0B0B] p-5 sm:p-7">
      <button
        type="button"
        onClick={onBack}
        className="lg:hidden mb-5 text-xs text-[#888] hover:text-white transition-colors"
      >
        ← Все заявки
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-white break-words">{app.name}</h2>
          <p className="text-xs text-[#555] mt-1">
            {fmtDate(app.createdAt)}
            {app.locale === 'en' ? ' · с английской версии сайта' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="px-3 py-1.5 rounded-lg border border-[#2A2A2A] text-xs text-[#666] hover:border-red-500/50 hover:text-red-400 transition-colors"
        >
          Удалить
        </button>
      </div>

      {/* Status */}
      <div className="mb-7">
        <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#444] mb-2">Статус</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Статус кандидата">
          {INTERN_STATUSES.map((s) => {
            const active = app.status === s
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => { if (!active) void onStatus(s) }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] ${
                  active
                    ? `${STATUS_TONE[s]} border-transparent`
                    : 'border-[#252525] text-[#777] hover:text-white hover:border-[#444]'
                }`}
              >
                {INTERN_STATUS_LABELS[s]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Portfolio */}
      <div className="mb-7">
        <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#444] mb-2">Портфолио</p>
        <a
          href={app.portfolio}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex max-w-full items-center gap-2 px-4 py-2.5 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-sm font-bold hover:bg-[#d4ff5c] transition-colors"
        >
          <span className="truncate">{displayUrl(app.portfolio)}</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>

      {/* Contacts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">
        {contacts.map((c) => (
          <div key={c.label} className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#444] mb-1">{c.label}</p>
            {c.href ? (
              <a
                href={c.href}
                {...(c.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="text-sm text-[#C8FF47] hover:underline break-all"
              >
                {c.value}
              </a>
            ) : (
              <p className="text-sm text-[#aaa] break-words">{c.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* About */}
      <div className="mb-7">
        <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#444] mb-2">О себе</p>
        <p className="text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap break-words bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-4 sm:p-5">
          {app.about}
        </p>
      </div>

      {/* Note */}
      <div>
        <label htmlFor="intern-note" className="block text-[10px] font-semibold tracking-[0.1em] uppercase text-[#444] mb-2">
          Заметка студии
        </label>
        <textarea
          id="intern-note"
          rows={3}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          placeholder="Впечатление, дата собеседования, тестовое… Видно только в админке."
          className="w-full bg-[#111] border border-[#252525] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#C8FF47] transition-colors resize-y"
        />
        <div className="flex items-center justify-end gap-3 mt-2 min-h-[28px]">
          {noteDirty && (
            <button
              type="button"
              onClick={saveNote}
              disabled={savingNote}
              className="px-3 py-1.5 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-xs font-bold hover:bg-[#d4ff5c] transition-[background-color,transform] duration-150 active:scale-[0.97] disabled:opacity-60"
            >
              {savingNote ? 'Сохраняем…' : 'Сохранить заметку'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
