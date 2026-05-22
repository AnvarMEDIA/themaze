'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FileUpload }       from './FileUpload'
import { MultiImageUpload } from './MultiImageUpload'
import type { Project, ProjectCategory } from '@/lib/types'
import { slugify } from '@/lib/utils'

const CATEGORIES: { value: ProjectCategory; label: string }[] = [
  { value: 'branding',   label: 'Branding' },
  { value: 'rebranding', label: 'Rebranding' },
  { value: 'identity',   label: 'Identity' },
  { value: 'ui-ux',      label: 'UI / UX' },
  { value: 'print',      label: 'Print' },
  { value: 'motion',     label: 'Motion' },
  { value: 'strategy',   label: 'Strategy' },
  { value: 'naming',     label: 'Naming' },
  { value: 'packaging',  label: 'Packaging' },
]

type FormState = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>

const EMPTY: FormState = {
  slug: '', title: '', titleRu: '', titleUz: '', client: '', categories: [],
  year: new Date().getFullYear(),
  description: '', descriptionRu: '', descriptionUz: '',
  shortDescription: '', shortDescriptionRu: '', shortDescriptionUz: '',
  coverImage: '', images: [],
  tags: [], services: [], servicesRu: [], servicesUz: [],
  featured: false, accentColor: '#C8FF47',
  results: '', resultsRu: '', resultsUz: '',
  status: 'published',
  showYear: true,
  imageAlts: {},
  metaTitle: '', metaTitleRu: '', metaTitleUz: '',
  metaDescription: '', metaDescriptionRu: '', metaDescriptionUz: '',
}

interface Props {
  project?: Project
}

export function ProjectForm({ project }: Props) {
  const router    = useRouter()
  const isEdit    = !!project
  const [form, setForm]         = useState<FormState>(project ? { ...EMPTY, ...project } : EMPTY)
  const [loading, setLoading]         = useState(false)
  const [translating, setTranslating]   = useState(false)
  const [translatingUz, setTranslatingUz] = useState(false)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'title' && !isEdit ? { slug: slugify(String(value)) } : {}),
    }))

  const setStr = (key: keyof FormState, val: string) => {
    const arrayKeys: (keyof FormState)[] = ['tags', 'services', 'servicesRu', 'servicesUz', 'images']
    if (arrayKeys.includes(key)) {
      setForm((prev) => ({
        ...prev,
        [key]: val.split('\n').map((s) => s.trim()).filter(Boolean),
      }))
    } else {
      setForm((prev) => ({ ...prev, [key]: val }))
    }
  }

  const handleTranslate = async () => {
    if (!form.titleRu && !form.descriptionRu && !form.shortDescriptionRu) {
      toast.error('Заполните поля на русском перед переводом')
      return
    }
    setTranslating(true)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:            form.titleRu,
          shortDescription: form.shortDescriptionRu,
          description:      form.descriptionRu,
          results:          form.resultsRu,
          services:         form.servicesRu,
          targetLang:       'en',
        }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? 'Translation failed')
      }
      const data = await res.json() as {
        title?: string; shortDescription?: string; description?: string
        results?: string; services?: string[]
      }
      setForm((prev) => ({
        ...prev,
        ...(data.title            ? { title: data.title, ...(!isEdit ? { slug: slugify(data.title) } : {}) } : {}),
        ...(data.shortDescription ? { shortDescription: data.shortDescription } : {}),
        ...(data.description      ? { description: data.description } : {}),
        ...(data.results          ? { results: data.results } : {}),
        ...(data.services?.length ? { services: data.services } : {}),
      }))
      toast.success('Перевод готов')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка перевода')
    } finally {
      setTranslating(false)
    }
  }

  const handleTranslateUz = async () => {
    if (!form.titleRu && !form.descriptionRu && !form.shortDescriptionRu) {
      toast.error('Заполните поля на русском перед переводом')
      return
    }
    setTranslatingUz(true)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:            form.titleRu,
          shortDescription: form.shortDescriptionRu,
          description:      form.descriptionRu,
          results:          form.resultsRu,
          services:         form.servicesRu,
          targetLang:       'uz',
        }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? 'Translation failed')
      }
      const data = await res.json() as {
        title?: string; shortDescription?: string; description?: string
        results?: string; services?: string[]
      }
      setForm((prev) => ({
        ...prev,
        ...(data.title            ? { titleUz: data.title } : {}),
        ...(data.shortDescription ? { shortDescriptionUz: data.shortDescription } : {}),
        ...(data.description      ? { descriptionUz: data.description } : {}),
        ...(data.results          ? { resultsUz: data.results } : {}),
        ...(data.services?.length ? { servicesUz: data.services } : {}),
      }))
      toast.success('O\'zbek tarjimasi tayyor')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tarjima xatosi')
    } finally {
      setTranslatingUz(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const url    = isEdit ? `/api/portfolio/${project!.id}` : '/api/portfolio'
      const method = isEdit ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success(isEdit ? 'Project updated!' : 'Project created!')
        router.push('/admin')
        router.refresh()
      } else {
        const d = await res.json() as { error?: string }
        toast.error(d.error ?? 'Something went wrong')
      }
    } catch {
      toast.error('Network error')
    }
    setLoading(false)
  }

  const input =
    'w-full bg-transparent border border-maze-border rounded-lg px-4 py-3 text-sm text-maze-cream placeholder:text-maze-muted focus:outline-none focus:border-maze-lime transition-colors'
  const textarea = input + ' resize-none'
  const labelRu  = 'label-sm text-[#888] block mb-2'
  const labelEn  = 'label-sm text-maze-muted block mb-2'

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Basic info */}
      <section className="space-y-4">
        <h2 className="label-sm text-maze-muted border-b border-maze-border pb-2">Basic Info</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelEn}>Slug *</label>
            <input
              required
              type="text"
              placeholder="project-slug"
              value={form.slug}
              onChange={(e) => set('slug', e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className={labelEn}>Client *</label>
            <input
              required
              type="text"
              placeholder="Client name"
              value={form.client}
              onChange={(e) => set('client', e.target.value)}
              className={input}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className={labelEn}>
              Categories *{' '}
              {form.categories.length === 0 && (
                <span className="text-red-400 normal-case font-normal">(выберите хотя бы одну)</span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {CATEGORIES.map((c) => {
                const checked = form.categories.includes(c.value)
                return (
                  <label
                    key={c.value}
                    className={[
                      'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                      checked
                        ? 'border-maze-lime bg-maze-lime/10 text-maze-lime'
                        : 'border-maze-border text-maze-muted hover:border-maze-cream hover:text-maze-cream',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...form.categories, c.value]
                          : form.categories.filter((x) => x !== c.value)
                        set('categories', next)
                      }}
                      className="hidden"
                    />
                    <span className={['w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors',
                      checked ? 'bg-maze-lime border-maze-lime' : 'border-current'].join(' ')}>
                      {checked && <span className="text-maze-ink text-[9px] font-black leading-none">✓</span>}
                    </span>
                    <span className="text-xs font-medium">{c.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelEn + ' mb-0'}>Year *</label>
              <button
                type="button"
                role="switch"
                aria-checked={form.showYear !== false}
                onClick={() => set('showYear', !(form.showYear !== false))}
                title={form.showYear !== false ? 'Year is shown on the site' : 'Year is hidden on the site'}
                className={[
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                  form.showYear !== false ? 'bg-maze-lime' : 'bg-maze-border',
                ].join(' ')}
              >
                <span
                  className={[
                    'inline-block h-3.5 w-3.5 rounded-full bg-maze-ink transition-transform',
                    form.showYear !== false ? 'translate-x-[18px]' : 'translate-x-[3px]',
                  ].join(' ')}
                />
              </button>
            </div>
            <input
              required
              type="number"
              min={2000}
              max={2099}
              value={form.year}
              onChange={(e) => set('year', parseInt(e.target.value))}
              className={input}
            />
            <p className="text-[11px] text-maze-muted mt-1.5">
              {form.showYear !== false
                ? 'Year is visible on the public site'
                : 'Year is hidden on the public site'}
            </p>
          </div>
          <div>
            <label className={labelEn}>Accent Colour</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={form.accentColor}
                onChange={(e) => set('accentColor', e.target.value)}
                className="h-11 w-12 rounded-lg border border-maze-border bg-transparent cursor-pointer p-1 shrink-0"
              />
              <input
                type="text"
                value={form.accentColor}
                onChange={(e) => set('accentColor', e.target.value)}
                className={input}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="featured"
              checked={form.featured}
              onChange={(e) => set('featured', e.target.checked)}
              className="w-4 h-4 rounded border-maze-border accent-maze-lime"
            />
            <label htmlFor="featured" className="label-sm text-maze-cream">Feature on homepage</label>
          </div>

          <div className="flex items-center gap-2">
            <label className="label-sm text-maze-muted">Status</label>
            <div className="inline-flex rounded-full border border-maze-border p-0.5">
              {(['published', 'draft'] as const).map((s) => {
                const active = (form.status ?? 'published') === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set('status', s)}
                    className={`px-3 py-1 rounded-full label-sm transition-colors ${
                      active
                        ? s === 'draft'
                          ? 'bg-yellow-400/15 text-yellow-300'
                          : 'bg-maze-lime/15 text-maze-lime'
                        : 'text-maze-muted hover:text-maze-cream'
                    }`}
                  >
                    {s === 'draft' ? 'Draft' : 'Published'}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Trilingual content */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-maze-border pb-2">
          <h2 className="label-sm text-maze-muted">Content</h2>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleTranslate}
              disabled={translating}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-maze-lime/40 text-maze-lime label-sm hover:bg-maze-lime/10 transition-colors disabled:opacity-50"
            >
              {translating ? (
                <>
                  <span className="w-3 h-3 border border-maze-lime border-t-transparent rounded-full animate-spin" />
                  Переводим…
                </>
              ) : (
                <>✦ RU → EN</>
              )}
            </button>
            <button
              type="button"
              onClick={handleTranslateUz}
              disabled={translatingUz}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-400/40 text-yellow-400 label-sm hover:bg-yellow-400/10 transition-colors disabled:opacity-50"
            >
              {translatingUz ? (
                <>
                  <span className="w-3 h-3 border border-yellow-400 border-t-transparent rounded-full animate-spin" />
                  Tarjima qilinmoqda…
                </>
              ) : (
                <>✦ RU → UZ</>
              )}
            </button>
          </div>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-3 gap-4">
          <p className="label-sm text-maze-lime">🇷🇺 Русский (основной)</p>
          <p className="label-sm text-maze-muted">🇬🇧 English (auto)</p>
          <p className="label-sm text-yellow-400">🇺🇿 O'zbek (auto)</p>
        </div>

        {/* Title */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelRu}>Название *</label>
            <input
              required
              type="text"
              placeholder="Название проекта"
              value={form.titleRu ?? ''}
              onChange={(e) => set('titleRu', e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className={labelEn}>Title *</label>
            <input
              required
              type="text"
              placeholder="Project title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className="label-sm text-yellow-400/70 block mb-2">Sarlavha (UZ)</label>
            <input
              type="text"
              placeholder="Loyiha nomi"
              value={form.titleUz ?? ''}
              onChange={(e) => set('titleUz', e.target.value)}
              className={input}
            />
          </div>
        </div>

        {/* Short description */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelRu}>Краткое описание</label>
            <input
              type="text"
              maxLength={500}
              placeholder="Одна строка для карточки"
              value={form.shortDescriptionRu ?? ''}
              onChange={(e) => set('shortDescriptionRu', e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className={labelEn}>Short description</label>
            <input
              type="text"
              maxLength={500}
              placeholder="One-line project description"
              value={form.shortDescription}
              onChange={(e) => set('shortDescription', e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className="label-sm text-yellow-400/70 block mb-2">Qisqa tavsif (UZ)</label>
            <input
              type="text"
              maxLength={500}
              placeholder="Karta uchun bir qator"
              value={form.shortDescriptionUz ?? ''}
              onChange={(e) => set('shortDescriptionUz', e.target.value)}
              className={input}
            />
          </div>
        </div>

        {/* Full description */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelRu}>Полное описание</label>
            <textarea
              rows={5}
              placeholder="Подробное описание проекта…"
              value={form.descriptionRu ?? ''}
              onChange={(e) => set('descriptionRu', e.target.value)}
              className={textarea}
            />
          </div>
          <div>
            <label className={labelEn}>Full description</label>
            <textarea
              rows={5}
              placeholder="Detailed project description…"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className={textarea}
            />
          </div>
          <div>
            <label className="label-sm text-yellow-400/70 block mb-2">To'liq tavsif (UZ)</label>
            <textarea
              rows={5}
              placeholder="Loyiha haqida batafsil…"
              value={form.descriptionUz ?? ''}
              onChange={(e) => set('descriptionUz', e.target.value)}
              className={textarea}
            />
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelRu}>Результаты</label>
            <textarea
              rows={2}
              placeholder="Измеримые результаты…"
              value={form.resultsRu ?? ''}
              onChange={(e) => set('resultsRu', e.target.value)}
              className={textarea}
            />
          </div>
          <div>
            <label className={labelEn}>Results / Impact</label>
            <textarea
              rows={2}
              placeholder="Measurable results…"
              value={form.results ?? ''}
              onChange={(e) => set('results', e.target.value)}
              className={textarea}
            />
          </div>
          <div>
            <label className="label-sm text-yellow-400/70 block mb-2">Natijalar (UZ)</label>
            <textarea
              rows={2}
              placeholder="O'lchangan natijalar…"
              value={form.resultsUz ?? ''}
              onChange={(e) => set('resultsUz', e.target.value)}
              className={textarea}
            />
          </div>
        </div>

        {/* Services */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelRu}>Услуги (по одной строке)</label>
            <textarea
              rows={4}
              placeholder={'Разработка бренда\nВизуальная идентика'}
              value={(form.servicesRu ?? []).join('\n')}
              onChange={(e) => setStr('servicesRu', e.target.value)}
              className={textarea}
            />
          </div>
          <div>
            <label className={labelEn}>Services (one per line)</label>
            <textarea
              rows={4}
              placeholder={'Brand Strategy\nVisual Identity'}
              value={form.services.join('\n')}
              onChange={(e) => setStr('services', e.target.value)}
              className={textarea}
            />
          </div>
          <div>
            <label className="label-sm text-yellow-400/70 block mb-2">Xizmatlar (UZ)</label>
            <textarea
              rows={4}
              placeholder={'Brendlash\nVizual aydentika'}
              value={(form.servicesUz ?? []).join('\n')}
              onChange={(e) => setStr('servicesUz', e.target.value)}
              className={textarea}
            />
          </div>
        </div>

        {/* Tags — no translation needed */}
        <div>
          <label className={labelEn}>Tags (one per line)</label>
          <textarea
            rows={3}
            placeholder={'Branding\nLuxury\nHospitality'}
            value={form.tags.join('\n')}
            onChange={(e) => setStr('tags', e.target.value)}
            className={textarea}
          />
        </div>
      </section>

      {/* Images */}
      <section className="space-y-4">
        <h2 className="label-sm text-maze-muted border-b border-maze-border pb-2">Images</h2>
        <FileUpload
          label="Cover image"
          value={form.coverImage}
          onChange={(url) => set('coverImage', url)}
        />
        <MultiImageUpload
          label="Gallery images"
          values={form.images}
          onChange={(urls) => set('images', urls)}
        />

        {/* Per-image alt text — important for Google Image Search */}
        {(form.coverImage || form.images.length > 0) && (
          <details className="rounded-xl bg-maze-dark/30 border border-maze-border">
            <summary className="px-4 py-3 cursor-pointer label-sm text-maze-muted hover:text-maze-cream transition-colors select-none">
              Image alt text
              <span className="ml-2 text-[10px] text-maze-muted">
                ({form.images.length + (form.coverImage ? 1 : 0)} images — leave blank for smart defaults)
              </span>
            </summary>
            <div className="px-4 pb-4 space-y-3">
              {[
                ...(form.coverImage ? [{ url: form.coverImage, label: 'Cover' }] : []),
                ...form.images.map((url, i) => ({ url, label: `Gallery ${i + 1}` })),
              ].map(({ url, label }) => (
                <div key={url} className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-16 h-9 rounded object-cover bg-maze-gray shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="label-sm text-maze-muted mb-1">{label}</p>
                    <input
                      type="text"
                      maxLength={200}
                      placeholder='e.g. "Centromed brand mark on a navy notebook"'
                      value={form.imageAlts?.[url] ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          imageAlts: { ...(prev.imageAlts ?? {}), [url]: e.target.value },
                        }))
                      }
                      className={input + ' text-xs'}
                    />
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      {/* SEO overrides */}
      <section className="space-y-4">
        <h2 className="label-sm text-maze-muted border-b border-maze-border pb-2">SEO</h2>
        <p className="text-[11px] text-maze-muted -mt-2">
          Leave blank to auto-generate <code className="font-mono text-maze-cream">&laquo;Title — Category for Client&raquo;</code> and use the short description.
          Google shows ~60 chars in titles and ~160 in descriptions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SeoField
            label="Meta title (EN)" max={70} value={form.metaTitle ?? ''}
            onChange={(v) => set('metaTitle', v)}
            placeholder='Override the auto-generated title'
            inputCls={input}
          />
          <SeoField
            label="Meta title (RU)" max={70} value={form.metaTitleRu ?? ''}
            onChange={(v) => set('metaTitleRu', v)}
            placeholder='Заголовок для поиска'
            inputCls={input}
          />
          <SeoField
            label="Meta title (UZ)" max={70} value={form.metaTitleUz ?? ''}
            onChange={(v) => set('metaTitleUz', v)}
            placeholder="Qidiruv uchun sarlavha"
            inputCls={input}
          />
          <SeoField
            label="Meta description (EN)" max={200} value={form.metaDescription ?? ''}
            onChange={(v) => set('metaDescription', v)}
            placeholder='One-line description shown in search results'
            inputCls={input}
            textarea
          />
          <SeoField
            label="Meta description (RU)" max={200} value={form.metaDescriptionRu ?? ''}
            onChange={(v) => set('metaDescriptionRu', v)}
            placeholder='Описание для выдачи Google / Яндекса'
            inputCls={input}
            textarea
          />
          <SeoField
            label="Meta description (UZ)" max={200} value={form.metaDescriptionUz ?? ''}
            onChange={(v) => set('metaDescriptionUz', v)}
            placeholder="Google qidiruvida ko'rsatiladi"
            inputCls={input}
            textarea
          />
        </div>
      </section>

      {/* Actions */}
      <div className="flex gap-4 pt-4 border-t border-maze-border">
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3.5 bg-[#C8FF47] text-[#0A0A0A] font-bold rounded-full label-sm hover:bg-[#F0EEE6] transition-colors disabled:opacity-60"
        >
          {loading ? 'Saving…' : isEdit ? 'Update project' : 'Create project'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-8 py-3.5 border border-maze-border text-maze-muted rounded-full label-sm hover:border-maze-cream hover:text-maze-cream transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function SeoField({
  label, max, value, onChange, placeholder, inputCls, textarea,
}: {
  label:       string
  max:         number
  value:       string
  onChange:   (v: string) => void
  placeholder: string
  inputCls:    string
  textarea?:   boolean
}) {
  const len     = value.length
  const warn    = len > Math.floor(max * 0.95)
  const overage = len > max
  const counterCls = overage ? 'text-red-400' : warn ? 'text-yellow-400' : 'text-maze-muted'
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="label-sm text-maze-muted">{label}</label>
        <span className={`text-[10px] font-mono tabular-nums ${counterCls}`}>{len}/{max}</span>
      </div>
      {textarea ? (
        <textarea
          rows={2}
          maxLength={max}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls + ' resize-none'}
        />
      ) : (
        <input
          type="text"
          maxLength={max}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      )}
    </div>
  )
}
