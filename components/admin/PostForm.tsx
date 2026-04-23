'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FileUpload } from './FileUpload'
import type { Post } from '@/lib/posts'
import { slugify } from '@/lib/utils'

type FormState = Omit<Post, 'id' | 'createdAt' | 'updatedAt'>

const EMPTY: FormState = {
  slug: '', title: '', titleRu: '',
  excerpt: '', excerptRu: '',
  body: '', bodyRu: '',
  coverImage: '',
  author: 'MAZE Studio',
  tags: [],
  status: 'draft',
  publishedAt: new Date().toISOString(),
}

interface Props {
  post?: Post
}

export function PostForm({ post }: Props) {
  const router = useRouter()
  const isEdit = !!post
  const [form, setForm]     = useState<FormState>(post ? { ...EMPTY, ...post } : EMPTY)
  const [loading, setLoading] = useState(false)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'title' && !isEdit ? { slug: slugify(String(value)) } : {}),
    }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const url    = isEdit ? `/api/insights/${post!.id}` : '/api/insights'
      const method = isEdit ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? 'Save failed')
      }
      toast.success(isEdit ? 'Post updated!' : 'Post created!')
      router.push('/admin/insights')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  const input    = 'w-full bg-transparent border border-maze-border rounded-lg px-4 py-3 text-sm text-maze-cream placeholder:text-maze-muted focus:outline-none focus:border-maze-lime transition-colors'
  const textarea = input + ' resize-y font-mono leading-relaxed'
  const lbl      = 'label-sm text-maze-muted block mb-2'

  return (
    <form onSubmit={submit} className="space-y-8 max-w-4xl">
      <section className="space-y-4">
        <h2 className="label-sm text-maze-muted border-b border-maze-border pb-2">Basics</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Title (EN) *</label>
            <input
              required
              placeholder="Why we rebrand"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className={lbl}>Slug *</label>
            <input
              required
              placeholder="why-we-rebrand"
              value={form.slug}
              onChange={(e) => set('slug', e.target.value)}
              className={input}
            />
          </div>
        </div>

        <div>
          <label className={lbl}>Title (RU)</label>
          <input
            placeholder="Почему мы делаем ребрендинг"
            value={form.titleRu}
            onChange={(e) => set('titleRu', e.target.value)}
            className={input}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Author</label>
            <input
              value={form.author}
              onChange={(e) => set('author', e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className={lbl}>Published at</label>
            <input
              type="datetime-local"
              value={form.publishedAt.slice(0, 16)}
              onChange={(e) => set('publishedAt', new Date(e.target.value).toISOString())}
              className={input}
            />
          </div>
          <div>
            <label className={lbl}>Status</label>
            <div className="inline-flex rounded-full border border-maze-border p-0.5 w-full">
              {(['draft', 'published'] as const).map((s) => {
                const active = form.status === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set('status', s)}
                    className={`flex-1 px-3 py-2 rounded-full label-sm transition-colors ${
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

        <div>
          <label className={lbl}>Tags (comma-separated)</label>
          <input
            placeholder="branding, strategy, typography"
            value={form.tags.join(', ')}
            onChange={(e) => set('tags', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            className={input}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="label-sm text-maze-muted border-b border-maze-border pb-2">Excerpt</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Excerpt (EN)</label>
            <textarea
              rows={3}
              placeholder="Short teaser shown in the list."
              value={form.excerpt}
              onChange={(e) => set('excerpt', e.target.value)}
              className={input + ' resize-none'}
            />
          </div>
          <div>
            <label className={lbl}>Excerpt (RU)</label>
            <textarea
              rows={3}
              value={form.excerptRu}
              onChange={(e) => set('excerptRu', e.target.value)}
              className={input + ' resize-none'}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="label-sm text-maze-muted border-b border-maze-border pb-2">Body (Markdown)</h2>
        <div className="grid grid-cols-1 gap-4">
          <details open>
            <summary className="label-sm text-maze-muted cursor-pointer mb-2">English body</summary>
            <textarea
              rows={18}
              placeholder={"# Heading\n\nWrite in **markdown**. Use ![alt](url) for images."}
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
              className={textarea}
            />
          </details>
          <details>
            <summary className="label-sm text-maze-muted cursor-pointer mb-2">Russian body</summary>
            <textarea
              rows={18}
              placeholder={"# Заголовок\n\nПиши на **markdown**…"}
              value={form.bodyRu}
              onChange={(e) => set('bodyRu', e.target.value)}
              className={textarea}
            />
          </details>
        </div>
        <p className="text-[11px] text-maze-muted">
          Supported: headings, paragraphs, **bold**, *italic*, [links](url), ![images](url), lists, blockquotes, `code`, --- horizontal rules.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="label-sm text-maze-muted border-b border-maze-border pb-2">Cover image</h2>
        <FileUpload
          label="Cover image"
          value={form.coverImage}
          onChange={(url) => set('coverImage', url)}
        />
      </section>

      <div className="flex gap-4 pt-4 border-t border-maze-border">
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3.5 bg-[#C8FF47] text-[#0A0A0A] font-bold rounded-full label-sm hover:bg-[#F0EEE6] transition-colors disabled:opacity-60"
        >
          {loading ? 'Saving…' : isEdit ? 'Update post' : 'Create post'}
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
