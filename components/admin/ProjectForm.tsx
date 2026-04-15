'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FileUpload } from './FileUpload'
import type { Project, ProjectCategory } from '@/lib/types'
import { slugify } from '@/lib/utils'

const CATEGORIES: { value: ProjectCategory; label: string }[] = [
  { value: 'branding',  label: 'Branding' },
  { value: 'identity',  label: 'Identity' },
  { value: 'ui-ux',    label: 'UI / UX' },
  { value: 'print',    label: 'Print' },
  { value: 'motion',   label: 'Motion' },
  { value: 'strategy', label: 'Strategy' },
]

type FormState = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>

const EMPTY: FormState = {
  slug: '', title: '', client: '', category: 'branding',
  year: new Date().getFullYear(),
  description: '', shortDescription: '',
  coverImage: '', images: [],
  tags: [], services: [],
  featured: false, accentColor: '#C8FF47', results: '',
}

interface Props {
  project?: Project
}

export function ProjectForm({ project }: Props) {
  const router  = useRouter()
  const isEdit  = !!project
  const [form, setForm]     = useState<FormState>(project ?? EMPTY)
  const [loading, setLoading] = useState(false)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'title' && !isEdit ? { slug: slugify(String(value)) } : {}),
    }))

  const setStr = (key: keyof FormState, val: string) => {
    const arrayKeys: (keyof FormState)[] = ['tags', 'services', 'images']
    if (arrayKeys.includes(key)) {
      setForm((prev) => ({
        ...prev,
        [key]: val.split('\n').map((s) => s.trim()).filter(Boolean),
      }))
    } else {
      setForm((prev) => ({ ...prev, [key]: val }))
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

  const inputClass =
    'w-full bg-transparent border border-maze-border rounded-lg px-4 py-3 text-sm text-maze-cream placeholder:text-maze-muted focus:outline-none focus:border-maze-lime transition-colors'

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic info */}
      <section className="space-y-4">
        <h2 className="label-sm text-maze-muted border-b border-maze-border pb-2">Basic Info</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-sm text-maze-muted block mb-2">Title *</label>
            <input
              required
              type="text"
              placeholder="Project title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="label-sm text-maze-muted block mb-2">Slug *</label>
            <input
              required
              type="text"
              placeholder="project-slug"
              value={form.slug}
              onChange={(e) => set('slug', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-sm text-maze-muted block mb-2">Client *</label>
            <input
              required
              type="text"
              placeholder="Client name"
              value={form.client}
              onChange={(e) => set('client', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="label-sm text-maze-muted block mb-2">Year *</label>
            <input
              required
              type="number"
              min={2000}
              max={2099}
              value={form.year}
              onChange={(e) => set('year', parseInt(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-sm text-maze-muted block mb-2">Category *</label>
            <select
              required
              value={form.category}
              onChange={(e) => set('category', e.target.value as ProjectCategory)}
              className={inputClass + ' appearance-none'}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value} className="bg-maze-dark">
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-sm text-maze-muted block mb-2">Accent Colour</label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={form.accentColor}
                onChange={(e) => set('accentColor', e.target.value)}
                className="h-11 w-16 rounded-lg border border-maze-border bg-transparent cursor-pointer p-1"
              />
              <input
                type="text"
                value={form.accentColor}
                onChange={(e) => set('accentColor', e.target.value)}
                className={inputClass + ' flex-1'}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="featured"
            checked={form.featured}
            onChange={(e) => set('featured', e.target.checked)}
            className="w-4 h-4 rounded border-maze-border accent-maze-lime"
          />
          <label htmlFor="featured" className="label-sm text-maze-cream">
            Feature on homepage
          </label>
        </div>
      </section>

      {/* Descriptions */}
      <section className="space-y-4">
        <h2 className="label-sm text-maze-muted border-b border-maze-border pb-2">Descriptions</h2>
        <div>
          <label className="label-sm text-maze-muted block mb-2">Short description (card preview) *</label>
          <input
            required
            type="text"
            maxLength={100}
            placeholder="One-line project description"
            value={form.shortDescription}
            onChange={(e) => set('shortDescription', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="label-sm text-maze-muted block mb-2">Full description *</label>
          <textarea
            required
            rows={5}
            placeholder="Detailed project description..."
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            className={inputClass + ' resize-none'}
          />
        </div>
        <div>
          <label className="label-sm text-maze-muted block mb-2">Results / Impact</label>
          <textarea
            rows={2}
            placeholder="Measurable results (e.g. 40% increase in brand recognition)"
            value={form.results ?? ''}
            onChange={(e) => set('results', e.target.value)}
            className={inputClass + ' resize-none'}
          />
        </div>
      </section>

      {/* Images */}
      <section className="space-y-4">
        <h2 className="label-sm text-maze-muted border-b border-maze-border pb-2">Images</h2>
        <FileUpload
          label="Cover image *"
          value={form.coverImage}
          onChange={(url) => set('coverImage', url)}
        />
        <div>
          <label className="label-sm text-maze-muted block mb-2">
            Gallery images (one URL per line)
          </label>
          <textarea
            rows={4}
            placeholder={'/portfolio/uploads/project-1.jpg\n/portfolio/uploads/project-2.jpg'}
            value={form.images.join('\n')}
            onChange={(e) => setStr('images', e.target.value)}
            className={inputClass + ' resize-none font-mono text-xs'}
          />
        </div>
      </section>

      {/* Tags / Services */}
      <section className="space-y-4">
        <h2 className="label-sm text-maze-muted border-b border-maze-border pb-2">Tags & Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-sm text-maze-muted block mb-2">Tags (one per line)</label>
            <textarea
              rows={4}
              placeholder={'Branding\nLuxury\nHospitality'}
              value={form.tags.join('\n')}
              onChange={(e) => setStr('tags', e.target.value)}
              className={inputClass + ' resize-none'}
            />
          </div>
          <div>
            <label className="label-sm text-maze-muted block mb-2">Services delivered (one per line)</label>
            <textarea
              rows={4}
              placeholder={'Brand Strategy\nVisual Identity\nBrand Guidelines'}
              value={form.services.join('\n')}
              onChange={(e) => setStr('services', e.target.value)}
              className={inputClass + ' resize-none'}
            />
          </div>
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
