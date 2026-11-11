'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { STYLE_ART } from '@/components/brief/styleArt'
import {
  BRIEF_LIMITS, TEXT_KEYS, isOptionalText, newOptionId, otherLang,
  type BriefContent, type BriefLang, type Loc,
} from '@/lib/briefTexts'

/**
 * The brief form's questions and answer options, edited in one language at a
 * time. Under every field is the same text in the other language, marked
 * when it is missing or older than the edit above it; "Translate" fills those
 * in from the language being edited. Nothing reaches the site until "Save".
 */

const LANG_NAME: Record<BriefLang, string> = { ru: 'RU', en: 'EN' }

const inputClass =
  'w-full bg-[#111] border border-[#252525] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#C8FF47] transition-colors'
const smallButton =
  'px-2.5 py-1.5 border border-[#252525] text-[#888] rounded-md text-xs hover:border-[#333] hover:text-white transition-colors active:scale-[0.97] disabled:opacity-30 disabled:pointer-events-none'

type ListKey = 'services' | 'styles' | 'palettes' | 'timelines' | 'budgets'

/* ── Every translatable text of the content, under one id ───────────────── */

interface Slot { id: string; loc: Loc; optional: boolean }

function slots(c: BriefContent): Slot[] {
  const out: Slot[] = TEXT_KEYS.map((key) => ({ id: `t:${key}`, loc: c.texts[key], optional: isOptionalText(key) }))
  for (const s of c.services)  out.push({ id: `services:${s.id}:label`, loc: s.label, optional: false })
  for (const s of c.styles) {
    out.push({ id: `styles:${s.id}:label`, loc: s.label, optional: false })
    out.push({ id: `styles:${s.id}:desc`,  loc: s.desc,  optional: true })
  }
  for (const p of c.palettes) {
    out.push({ id: `palettes:${p.id}:label`, loc: p.label, optional: false })
    out.push({ id: `palettes:${p.id}:desc`,  loc: p.desc,  optional: true })
  }
  for (const t of c.timelines) out.push({ id: `timelines:${t.id}:label`, loc: t.label, optional: false })
  for (const b of c.budgets)   out.push({ id: `budgets:${b.id}:label`,   loc: b.label, optional: false })
  return out
}

/** The content with one slot's text in one language replaced. */
function withSlot(c: BriefContent, slotId: string, lang: BriefLang, text: string): BriefContent {
  const [kind, a, field] = slotId.split(':')
  if (kind === 't') {
    const current = c.texts[a]
    return current ? { ...c, texts: { ...c.texts, [a]: { ...current, [lang]: text } } } : c
  }
  const list = kind as ListKey
  return {
    ...c,
    [list]: (c[list] as unknown as Array<{ id: string } & Record<string, unknown>>).map((item) =>
      item.id === a ? { ...item, [field]: { ...(item[field] as Loc), [lang]: text } } : item),
  }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const chunk = <T,>(arr: T[], n: number) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n))

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function BriefFormEditorPage() {
  const [saved,  setSaved]  = useState<BriefContent | null>(null)
  const [draft,  setDraft]  = useState<BriefContent | null>(null)
  const [lang,   setLang]   = useState<BriefLang>('ru')
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const to    = otherLang(lang)
  const dirty = saved !== null && draft !== null && !same(saved, draft)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/brief-content', { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const data = await res.json() as { content: BriefContent }
      setSaved(data.content)
      setDraft(data.content)
    } catch {
      toast.error('Не удалось загрузить форму брифа')
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // The saved texts, to tell a text edited since then from one that wasn't.
  const savedSlots = useMemo(() => new Map(saved ? slots(saved).map((s) => [s.id, s.loc]) : []), [saved])

  /** Missing in the other language, or edited here since the save while the other stayed as it was. */
  const stale = useCallback((s: Slot): boolean => {
    const src = s.loc[lang].trim()
    if (!src) return false
    if (!s.loc[to].trim()) return true
    const before = savedSlots.get(s.id)
    return !!before && before[lang].trim() !== src && before[to].trim() === s.loc[to].trim()
  }, [lang, to, savedSlots])

  const all      = useMemo(() => (draft ? slots(draft) : []), [draft])
  const pending  = useMemo(() => all.filter(stale), [all, stale])
  const missing  = (l: BriefLang) => all.filter((s) => !s.optional && !s.loc[l].trim()).length
  const braces   = all.filter((s) => /[{}]/.test(s.loc.ru + s.loc.en)).length

  /* ── Editing ── */

  const setText = (slotId: string, value: string) => setDraft((d) => (d ? withSlot(d, slotId, lang, value) : d))

  const update = <K extends ListKey>(list: K, id: string, patch: Partial<BriefContent[K][number]>) =>
    setDraft((d) => d && ({
      ...d,
      [list]: (d[list] as Array<{ id: string }>).map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }))

  const move = (list: ListKey, id: string, by: -1 | 1) =>
    setDraft((d) => {
      if (!d) return d
      const items = [...(d[list] as Array<{ id: string }>)]
      const i = items.findIndex((x) => x.id === id)
      const j = i + by
      if (i < 0 || j < 0 || j >= items.length) return d
      ;[items[i], items[j]] = [items[j], items[i]]
      return { ...d, [list]: items }
    })

  const remove = (list: ListKey, id: string) =>
    setDraft((d) => d && ({ ...d, [list]: (d[list] as Array<{ id: string }>).filter((x) => x.id !== id) }))

  const add = (list: 'services' | 'palettes' | 'timelines' | 'budgets') =>
    setDraft((d) => {
      if (!d) return d
      const prefix = { services: 'service', palettes: 'palette', timelines: 'timeline', budgets: 'budget' }[list]
      const id = newOptionId(prefix, (d[list] as Array<{ id: string }>).map((x) => x.id))
      const empty: Loc = { ru: '', en: '' }
      const item = list === 'palettes'
        ? { id, label: empty, desc: empty, swatches: ['#0A0A0A', '#888888', '#FFFFFF'] }
        : { id, label: empty }
      return { ...d, [list]: [...(d[list] as unknown[]), item] }
    })

  /** Was this option there at the last save? A sent brief may name it then, so it is hidden, not deleted. */
  const wasSaved = (list: ListKey, id: string) => !!saved && (saved[list] as Array<{ id: string }>).some((x) => x.id === id)

  /* ── Translating ── */

  const translate = async (everything: boolean) => {
    if (!draft || progress) return
    const list = (everything ? all.filter((s) => s.loc[lang].trim()) : pending)
      .map((s) => ({ id: s.id, text: s.loc[lang].trim() }))
    if (list.length === 0) return
    setProgress({ done: 0, total: list.length })

    // In batches, side by side: one long request would make the page wait
    // for the slowest text.
    const results = await Promise.allSettled(chunk(list, 30).map(async (items) => {
      const res  = await fetch('/api/brief-content/translate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ from: lang, to, items }),
      })
      const data = await res.json().catch(() => null) as { items?: Array<{ id: string; text: string }>; error?: string } | null
      if (!res.ok || !data?.items) throw new Error(data?.error || `Ошибка ${res.status}`)
      setDraft((d) => (d ? data.items!.reduce((acc, it) => withSlot(acc, it.id, to, it.text), d) : d))
      setProgress((p) => p && { ...p, done: p.done + items.length })
    }))
    setProgress(null)

    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (failed.length === 0) toast.success(`Переведено на ${LANG_NAME[to]}: ${list.length}. Проверьте и сохраните.`)
    else toast.error(failed[0].reason instanceof Error ? failed[0].reason.message : 'Не удалось перевести')
  }

  /* ── Saving ── */

  const save = async () => {
    if (!draft) return
    const gaps = { ru: missing('ru'), en: missing('en') }
    if (gaps.ru || gaps.en) {
      const where = (['ru', 'en'] as const).filter((l) => gaps[l]).map((l) => `${LANG_NAME[l]}: ${gaps[l]}`).join(', ')
      toast.error(`Не заполнено (${where}). Заполните или нажмите «Перевести».`)
      return
    }
    if (braces) {
      toast.error('Фигурные скобки { } в текстах нельзя: уберите их')
      return
    }
    setSaving(true)
    try {
      const res  = await fetch('/api/brief-content', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(draft),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ? `${data.error}${data.path ? ` (${data.path})` : ''}` : 'Не удалось сохранить')
      setSaved(data as BriefContent)
      setDraft(data as BriefContent)
      toast.success('Сохранено: форма брифа на сайте обновилась')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  if (!draft) {
    return <div className="px-4 sm:px-8 py-8 text-sm text-[#555]">Загружаю форму брифа…</div>
  }

  /* ── Pieces bound to this draft ── */

  const field = (key: string, label: string, opts: { multiline?: boolean } = {}) => {
    const slot = all.find((s) => s.id === `t:${key}`)
    if (!slot) return null
    return (
      <TextField
        key={key} id={`t-${key}`} label={label} slot={slot} lang={lang} stale={stale(slot)}
        multiline={opts.multiline} max={BRIEF_LIMITS.text}
        onChange={(v) => setText(slot.id, v)}
      />
    )
  }
  const slotOf = (id: string) => all.find((s) => s.id === id)!

  return (
    <div className="px-4 sm:px-8 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-4">
        <Link href="/admin/briefs" className="text-xs text-[#555] hover:text-white transition-colors">← Briefs</Link>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-1">Brief form</h1>
        <p className="text-sm text-[#555] mt-1 max-w-lg">
          Вопросы и варианты ответов в брифе на сайте. Правите на одном языке, «Перевести» заполнит второй.
          На сайт попадёт после «Сохранить».
        </p>
      </div>

      {/* The controls stay in reach while the form scrolls; on a phone, under the admin's top bar. */}
      <div className="sticky top-14 lg:top-0 z-10 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 mb-6 bg-[#0A0A0A]/95 backdrop-blur border-b border-[#1E1E1E]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-[#252525] p-0.5" role="group" aria-label="Язык правки">
            {(['ru', 'en'] as const).map((l) => (
              <button
                key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l}
                className={`px-3 py-1.5 rounded-md text-xs font-bold tracking-wider transition-colors ${
                  lang === l ? 'bg-[#C8FF47] text-[#0A0A0A]' : 'text-[#888] hover:text-white'}`}
              >
                {LANG_NAME[l]}
              </button>
            ))}
          </div>
          <button
            type="button" onClick={() => translate(false)} disabled={!!progress || pending.length === 0}
            className="px-3.5 py-2.5 border border-[#C8FF47]/40 text-[#C8FF47] rounded-lg text-sm hover:bg-[#C8FF47]/10 transition-colors active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
            title={pending.length ? 'Пустые и изменённые тексты' : 'Всё переведено'}
          >
            {progress
              ? `Перевожу… ${progress.done}/${progress.total}`
              : pending.length ? `Перевести на ${LANG_NAME[to]} · ${pending.length}` : `${LANG_NAME[to]}: всё переведено`}
          </button>
          <button
            type="button" onClick={() => translate(true)} disabled={!!progress}
            className="px-2 py-2.5 text-xs text-[#555] hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
            title={`Перевести все тексты на ${LANG_NAME[to]} заново`}
          >
            всё заново
          </button>
          {dirty && (
            <button
              type="button" onClick={() => { if (saved) setDraft(saved) }}
              className="px-4 py-2.5 border border-[#252525] text-[#888] rounded-lg text-sm hover:border-[#333] hover:text-white transition-colors active:scale-[0.97]"
            >
              Отменить
            </button>
          )}
          <button
            type="button" onClick={save} disabled={!dirty || saving || !!progress}
            className="px-5 py-2.5 bg-[#C8FF47] text-[#0A0A0A] font-bold rounded-lg text-sm hover:bg-[#F0EEE6] transition-colors active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
          >
            {saving ? 'Сохраняю…' : dirty ? 'Сохранить' : 'Сохранено'}
          </button>
        </div>
        {(missing(to) > 0 || missing(lang) > 0) && (
          <p className="mt-2 text-xs text-amber-300/80">
            {missing(lang) > 0 && `Не заполнено в ${LANG_NAME[lang]}: ${missing(lang)}. `}
            {missing(to) > 0 && `Нет перевода на ${LANG_NAME[to]}: ${missing(to)}.`}
          </p>
        )}
      </div>

      <Section title="Страница брифа">
        {field('label', 'Надпись над заголовком')}
        {field('heading', 'Заголовок')}
        {field('sub', 'Подзаголовок', { multiline: true })}
      </Section>

      <Section title="Шаги" note="Название шага видно в полосе шагов над формой; заголовок и пояснение — над вопросами шага.">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="rounded-lg border border-[#1E1E1E] p-3 space-y-3">
            <p className="text-[11px] uppercase tracking-[0.15em] text-[#555]">Шаг {n}</p>
            {field(`steps.${n - 1}`, 'Название шага')}
            {field(`step${n}.heading`, 'Заголовок')}
            {field(`step${n}.sub`, 'Пояснение', { multiline: true })}
          </div>
        ))}
      </Section>

      <Section title="Шаг 1 · Контакты">
        {field('fields.name', 'Имя: вопрос')}
        {field('fields.namePlaceholder', 'Имя: подсказка в поле')}
        {field('fields.phone', 'Телефон: вопрос')}
        {field('fields.email', 'Email: вопрос')}
        {field('fields.emailPlaceholder', 'Email: подсказка в поле')}
        {field('fields.company', 'Компания: вопрос')}
        {field('fields.companyPlaceholder', 'Компания: подсказка в поле')}
        {field('fields.website', 'Сайт: вопрос')}
        {field('fields.websitePlaceholder', 'Сайт: подсказка в поле')}
      </Section>

      <Section title="Шаг 2 · Проект">
        {field('fields.services', 'Услуги: вопрос')}
        {field('fields.servicesHint', 'Услуги: пояснение под вопросом')}
        <OptionList
          title="Варианты услуг" addLabel="Добавить услугу"
          onAdd={() => add('services')} canAdd={draft.services.length < BRIEF_LIMITS.services}
        >
          {draft.services.map((s, i) => (
            <OptionRow
              key={s.id} hidden={s.hidden}
              first={i === 0} last={i === draft.services.length - 1}
              onUp={() => move('services', s.id, -1)} onDown={() => move('services', s.id, 1)}
              onToggle={wasSaved('services', s.id) ? () => update('services', s.id, { hidden: !s.hidden }) : undefined}
              onRemove={wasSaved('services', s.id) ? undefined : () => remove('services', s.id)}
            >
              <TextField
                id={`svc-${s.id}`} label="" slot={slotOf(`services:${s.id}:label`)} lang={lang}
                stale={stale(slotOf(`services:${s.id}:label`))} max={BRIEF_LIMITS.optionLabel}
                onChange={(v) => setText(`services:${s.id}:label`, v)}
              />
            </OptionRow>
          ))}
        </OptionList>
        {field('fields.description', 'Описание проекта: вопрос')}
        {field('fields.descriptionPlaceholder', 'Описание проекта: подсказка в поле', { multiline: true })}
        {field('fields.goals', 'Цели: вопрос')}
        {field('fields.goalsPlaceholder', 'Цели: подсказка в поле', { multiline: true })}
        {field('fields.audience', 'Аудитория: вопрос')}
        {field('fields.audiencePlaceholder', 'Аудитория: подсказка в поле', { multiline: true })}
        {field('fields.competitors', 'Конкуренты: вопрос')}
        {field('fields.competitorsPlaceholder', 'Конкуренты: подсказка в поле', { multiline: true })}
      </Section>

      <Section title="Шаг 3 · Стиль">
        {field('fields.styles', 'Стилистика: вопрос')}
        {field('fields.stylesHint', 'Стилистика: пояснение под вопросом')}
        <OptionList title="Варианты стилистики" note="У каждого стиля свой рисунок, поэтому новых не добавить: можно переименовать или скрыть.">
          {draft.styles.map((s) => (
            <OptionRow
              key={s.id} hidden={s.hidden}
              lead={<span className="block w-10 h-10 p-1.5 rounded-md border border-[#252525] text-[#bbb]">{STYLE_ART[s.id]}</span>}
              onToggle={() => update('styles', s.id, { hidden: !s.hidden })}
            >
              <TextField
                id={`sty-${s.id}`} label="Название" slot={slotOf(`styles:${s.id}:label`)} lang={lang}
                stale={stale(slotOf(`styles:${s.id}:label`))} max={BRIEF_LIMITS.optionLabel}
                onChange={(v) => setText(`styles:${s.id}:label`, v)}
              />
              <TextField
                id={`sty-${s.id}-d`} label="Описание" slot={slotOf(`styles:${s.id}:desc`)} lang={lang}
                stale={stale(slotOf(`styles:${s.id}:desc`))} max={BRIEF_LIMITS.optionDesc}
                onChange={(v) => setText(`styles:${s.id}:desc`, v)}
              />
            </OptionRow>
          ))}
        </OptionList>
        {field('fields.colors', 'Цвета: вопрос')}
        {field('fields.colorsHint', 'Цвета: пояснение под вопросом')}
        <OptionList
          title="Палитры" addLabel="Добавить палитру"
          onAdd={() => add('palettes')} canAdd={draft.palettes.length < BRIEF_LIMITS.palettes}
        >
          {draft.palettes.map((p, i) => (
            <OptionRow
              key={p.id} hidden={p.hidden}
              first={i === 0} last={i === draft.palettes.length - 1}
              onUp={() => move('palettes', p.id, -1)} onDown={() => move('palettes', p.id, 1)}
              onToggle={wasSaved('palettes', p.id) ? () => update('palettes', p.id, { hidden: !p.hidden }) : undefined}
              onRemove={wasSaved('palettes', p.id) ? undefined : () => remove('palettes', p.id)}
            >
              <Swatches
                colors={p.swatches}
                onChange={(swatches) => update('palettes', p.id, { swatches })}
              />
              <TextField
                id={`pal-${p.id}`} label="Название" slot={slotOf(`palettes:${p.id}:label`)} lang={lang}
                stale={stale(slotOf(`palettes:${p.id}:label`))} max={BRIEF_LIMITS.optionLabel}
                onChange={(v) => setText(`palettes:${p.id}:label`, v)}
              />
              <TextField
                id={`pal-${p.id}-d`} label="Описание" slot={slotOf(`palettes:${p.id}:desc`)} lang={lang}
                stale={stale(slotOf(`palettes:${p.id}:desc`))} max={BRIEF_LIMITS.optionDesc}
                onChange={(v) => setText(`palettes:${p.id}:desc`, v)}
              />
            </OptionRow>
          ))}
        </OptionList>
        {field('fields.refLinks', 'Ссылки-референсы: вопрос')}
        {field('fields.refLinksPlaceholder', 'Ссылки-референсы: подсказка в поле', { multiline: true })}
      </Section>

      <Section title="Шаг 4 · Сроки и бюджет">
        {field('fields.timeline', 'Сроки: вопрос')}
        <OptionList
          title="Варианты сроков" addLabel="Добавить срок"
          onAdd={() => add('timelines')} canAdd={draft.timelines.length < BRIEF_LIMITS.choices}
        >
          {draft.timelines.map((t, i) => (
            <OptionRow
              key={t.id} first={i === 0} last={i === draft.timelines.length - 1}
              onUp={() => move('timelines', t.id, -1)} onDown={() => move('timelines', t.id, 1)}
              onRemove={draft.timelines.length > 1 ? () => remove('timelines', t.id) : undefined}
            >
              <TextField
                id={`tl-${t.id}`} label="" slot={slotOf(`timelines:${t.id}:label`)} lang={lang}
                stale={stale(slotOf(`timelines:${t.id}:label`))} max={BRIEF_LIMITS.timelineLabel}
                onChange={(v) => setText(`timelines:${t.id}:label`, v)}
              />
            </OptionRow>
          ))}
        </OptionList>
        {field('fields.budget', 'Бюджет: вопрос')}
        <OptionList
          title="Варианты бюджета" addLabel="Добавить бюджет"
          onAdd={() => add('budgets')} canAdd={draft.budgets.length < BRIEF_LIMITS.choices}
        >
          {draft.budgets.map((b, i) => (
            <OptionRow
              key={b.id} first={i === 0} last={i === draft.budgets.length - 1}
              onUp={() => move('budgets', b.id, -1)} onDown={() => move('budgets', b.id, 1)}
              onRemove={draft.budgets.length > 1 ? () => remove('budgets', b.id) : undefined}
            >
              <TextField
                id={`bd-${b.id}`} label="" slot={slotOf(`budgets:${b.id}:label`)} lang={lang}
                stale={stale(slotOf(`budgets:${b.id}:label`))} max={BRIEF_LIMITS.budgetLabel}
                onChange={(v) => setText(`budgets:${b.id}:label`, v)}
              />
            </OptionRow>
          ))}
        </OptionList>
        {field('fields.source', 'Откуда узнали: вопрос')}
        {field('fields.sourcePlaceholder', 'Откуда узнали: подсказка в поле')}
        {field('fields.notes', 'Дополнительно: вопрос')}
        {field('fields.notesPlaceholder', 'Дополнительно: подсказка в поле', { multiline: true })}
      </Section>

      <Section title="После отправки">
        {field('success.label', 'Надпись над заголовком')}
        {field('success.heading', 'Заголовок')}
        {field('success.body', 'Текст', { multiline: true })}
        {field('success.cta', 'Кнопка')}
      </Section>
    </div>
  )
}

/* ── Pieces ─────────────────────────────────────────────────────────────── */

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-[#888] mb-1">{title}</h2>
      {note && <p className="text-xs text-[#555] mb-3 max-w-xl">{note}</p>}
      <div className="rounded-xl border border-[#1E1E1E] bg-[#0D0D0D] p-4 space-y-4 mt-3">{children}</div>
    </section>
  )
}

/**
 * One text in the language being edited, with the other language under it:
 * as it stands, or marked missing / older than this one.
 */
function TextField({ id, label, slot, lang, stale, multiline, max, onChange }: {
  id: string; label: string; slot: Slot; lang: BriefLang; stale: boolean
  multiline?: boolean; max: number; onChange: (value: string) => void
}) {
  const to = otherLang(lang)
  const value = slot.loc[lang]
  const other = slot.loc[to].trim()
  const empty = !slot.optional && !value.trim()
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <div className="min-w-0 flex-1">
      {label && <label htmlFor={id} className="block text-xs text-[#888] mb-1.5">{label}{slot.optional && <span className="text-[#444]"> · можно пусто</span>}</label>}
      <Tag
        id={id} value={value} maxLength={max}
        onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange(e.target.value)}
        rows={multiline ? 2 : undefined}
        aria-label={label || undefined}
        className={`${inputClass} ${multiline ? 'resize-y min-h-[2.75rem]' : ''} ${empty ? 'border-amber-500/50' : ''}`}
      />
      <p className="mt-1 text-[11px] leading-snug truncate">
        <span className="text-[#444] mr-1.5">{LANG_NAME[to]}</span>
        {other
          ? <span className={stale ? 'text-amber-300/80' : 'text-[#555]'}>{stale && 'устарел · '}{other}</span>
          : slot.optional ? <span className="text-[#333]">пусто</span> : <span className="text-amber-300/80">нет перевода</span>}
      </p>
    </div>
  )
}

function OptionList({ title, note, addLabel, onAdd, canAdd = true, children }: {
  title: string; note?: string; addLabel?: string; onAdd?: () => void; canAdd?: boolean; children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-[#1E1E1E] p-3">
      <p className="text-[11px] uppercase tracking-[0.15em] text-[#555] mb-1">{title}</p>
      {note && <p className="text-xs text-[#444] mb-2">{note}</p>}
      <div className="divide-y divide-[#1A1A1A]">{children}</div>
      {onAdd && (
        <button type="button" onClick={onAdd} disabled={!canAdd} className={`${smallButton} mt-3`}>
          + {addLabel}
        </button>
      )}
    </div>
  )
}

function OptionRow({ hidden, lead, first, last, onUp, onDown, onToggle, onRemove, children }: {
  hidden?: boolean; lead?: ReactNode; first?: boolean; last?: boolean
  onUp?: () => void; onDown?: () => void; onToggle?: () => void; onRemove?: () => void
  children: ReactNode
}) {
  return (
    <div className={`flex items-start gap-3 py-3 ${hidden ? 'opacity-50' : ''}`}>
      {lead}
      <div className="min-w-0 flex-1 flex flex-col sm:flex-row gap-3">{children}</div>
      <div className="flex items-center gap-1 shrink-0 pt-0.5">
        {onUp && <button type="button" onClick={onUp} disabled={first} className={smallButton} aria-label="Выше">↑</button>}
        {onDown && <button type="button" onClick={onDown} disabled={last} className={smallButton} aria-label="Ниже">↓</button>}
        {onToggle && (
          <button type="button" onClick={onToggle} className={smallButton} title={hidden ? 'Вернуть в форму' : 'Убрать из формы; в отправленных брифах останется'}>
            {hidden ? 'Показать' : 'Скрыть'}
          </button>
        )}
        {onRemove && <button type="button" onClick={onRemove} className={`${smallButton} hover:text-red-400`}>Удалить</button>}
      </div>
    </div>
  )
}

/** A palette's colours: pick, add, remove. */
function Swatches({ colors, onChange }: { colors: string[]; onChange: (colors: string[]) => void }) {
  return (
    <div className="shrink-0">
      <p className="text-xs text-[#888] mb-1.5">Цвета</p>
      <div className="flex items-center gap-1.5">
        {colors.map((hex, i) => (
          <span key={i} className="relative group">
            <input
              type="color" value={hex} aria-label={`Цвет ${i + 1}`}
              onChange={(e) => onChange(colors.map((c, j) => (j === i ? e.target.value.toUpperCase() : c)))}
              className="w-8 h-8 rounded-md border border-[#333] bg-transparent cursor-pointer p-0"
            />
            {colors.length > 1 && (
              <button
                type="button" aria-label={`Убрать цвет ${i + 1}`}
                onClick={() => onChange(colors.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#222] text-[#aaa] text-[10px] leading-4 opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                ×
              </button>
            )}
          </span>
        ))}
        {colors.length < BRIEF_LIMITS.swatches && (
          <button type="button" onClick={() => onChange([...colors, '#CCCCCC'])} className={smallButton} aria-label="Добавить цвет">+</button>
        )}
      </div>
    </div>
  )
}
