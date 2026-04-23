'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { Post } from '@/lib/posts'

function fmt(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

export default function AdminInsightsPage() {
  const [posts, setPosts]     = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery]     = useState('')
  const [filter, setFilter]   = useState<'all' | 'published' | 'draft'>('all')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/insights', { cache: 'no-store' })
      setPosts(await res.json())
    } catch {
      toast.error('Failed to load posts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    const prev = posts
    setPosts((p) => p.filter((x) => x.id !== id))
    try {
      const res = await fetch(`/api/insights/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Post deleted')
    } catch {
      setPosts(prev)
      toast.error('Delete failed')
    }
  }

  const q = query.trim().toLowerCase()
  const filtered = posts.filter((p) => {
    if (filter !== 'all' && p.status !== filter) return false
    if (!q) return true
    return (
      p.title.toLowerCase().includes(q) ||
      (p.titleRu ?? '').toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      p.tags.join(' ').toLowerCase().includes(q)
    )
  })

  const counts = {
    all: posts.length,
    published: posts.filter((p) => p.status === 'published').length,
    draft: posts.filter((p) => p.status === 'draft').length,
  }

  return (
    <div className="px-8 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Insights</h1>
          {!loading && (
            <p className="text-sm text-[#555] mt-1">
              {counts.all} total · {counts.published} published · {counts.draft} draft
            </p>
          )}
        </div>
        <Link
          href="/admin/insights/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#C8FF47] text-[#0A0A0A] font-bold rounded-lg text-sm hover:bg-[#F0EEE6] transition-colors"
        >
          <span className="text-base leading-none">+</span> New post
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
        <div className="relative lg:w-80">
          <input
            type="search"
            placeholder="Search title, slug, tags…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#111] border border-[#252525] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#C8FF47]"
            aria-label="Search insights"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'published', 'draft'] as const).map((f) => {
            const active = filter === f
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? 'border-[#C8FF47] text-[#C8FF47] bg-[#C8FF47]/10'
                    : 'border-[#252525] text-[#555] hover:border-[#333] hover:text-[#888]'
                }`}
              >
                {f === 'all' ? `All (${counts.all})` : f === 'published' ? `Published (${counts.published})` : `Draft (${counts.draft})`}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-[#1E1E1E] overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_120px_90px_140px_120px] gap-4 px-5 py-3 bg-[#0D0D0D] border-b border-[#1E1E1E]">
          {['Title', 'Status', 'Read time', 'Published', 'Actions'].map((h) => (
            <span key={h} className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#444]">{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-[#0D0D0D] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-[#444] mb-3">
              {posts.length === 0 ? 'No posts yet.' : 'No posts match your filters.'}
            </p>
            {posts.length === 0 && (
              <Link href="/admin/insights/new" className="text-sm text-[#C8FF47] hover:underline">
                Write your first post →
              </Link>
            )}
          </div>
        ) : (
          filtered.map((p) => {
            const words = p.body?.trim().split(/\s+/).length || 0
            const mins  = Math.max(1, Math.round(words / 200))
            return (
              <div
                key={p.id}
                className="flex md:grid md:grid-cols-[1fr_120px_90px_140px_120px] gap-4 items-center px-5 py-4 border-b border-[#1A1A1A] last:border-b-0 bg-[#080808] hover:bg-[#0D0D0D] transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{p.title}</p>
                  <p className="text-xs text-[#444] mt-0.5 truncate">/{p.slug}</p>
                </div>
                <div className="hidden md:flex">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                    p.status === 'published'
                      ? 'text-[#C8FF47] bg-[#C8FF47]/10'
                      : 'text-yellow-300 bg-yellow-400/15'
                  }`}>
                    {p.status}
                  </span>
                </div>
                <span className="hidden md:block text-xs text-[#555]">{mins} min</span>
                <span className="hidden md:block text-xs text-[#555]">{fmt(p.publishedAt)}</span>
                <div className="flex gap-3 ml-auto md:ml-0">
                  <a
                    href={`/insights/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#555] hover:text-[#47C8FF] transition-colors"
                  >
                    Preview
                  </a>
                  <Link
                    href={`/admin/insights/${p.id}`}
                    className="text-xs text-[#555] hover:text-[#C8FF47] transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(p.id, p.title)}
                    className="text-xs text-[#555] hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
