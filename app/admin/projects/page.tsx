'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { Reorder, useDragControls } from 'framer-motion'
import type { Project, ProjectCategory } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/utils'
import toast from 'react-hot-toast'
import { showUndoToast } from '@/components/admin/UndoToast'

type Views = { total: number; week: number }

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [views,    setViews]    = useState<Record<string, Views>>({})
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<string>('all')
  const [query,    setQuery]    = useState('')
  const [savingOrder, setSavingOrder] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    try {
      const res  = await fetch('/api/portfolio', { cache: 'no-store' })
      const data = await res.json() as Project[]
      setProjects(data)
    } catch {
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Pull pageview stats once on mount — used to populate the "Views"
  // and "Week" columns. A failure here must not break the table.
  useEffect(() => {
    let cancelled = false
    fetch('/api/analytics', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { daily?: Record<string, Record<string, number>> } | null) => {
        if (cancelled || !data?.daily) return
        const todayMs   = Date.now()
        const weekStart = new Date(todayMs - 6 * 86_400_000).toISOString().slice(0, 10)
        const next: Record<string, Views> = {}
        for (const [path, byDate] of Object.entries(data.daily)) {
          if (!path.startsWith('/portfolio/')) continue
          const slug = path.slice('/portfolio/'.length)
          let total = 0, week = 0
          for (const [d, c] of Object.entries(byDate)) {
            total += c
            if (d >= weekStart) week += c
          }
          next[slug] = { total, week }
        }
        setViews(next)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const handleDelete = async (id: string, title: string) => {
    const prev = projects
    setProjects((p) => p.filter((x) => x.id !== id))
    try {
      const res = await fetch(`/api/portfolio/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      showUndoToast({
        message: `"${title}" deleted`,
        onUndo: async () => {
          const r = await fetch(`/api/portfolio/${id}?action=restore`, { method: 'POST' })
          if (!r.ok) throw new Error()
          load()
        },
      })
    } catch {
      setProjects(prev)
      toast.error('Delete failed')
    }
  }

  const persistOrder = useCallback(async (ordered: Project[]) => {
    setSavingOrder(true)
    try {
      const res = await fetch('/api/portfolio/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ordered.map((p) => p.id) }),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast.error('Reorder failed — reloading')
      load()
    } finally {
      setSavingOrder(false)
    }
  }, [load])

  const handleReorder = (next: Project[]) => {
    setProjects(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => persistOrder(next), 400)
  }

  const categories = Array.from(new Set(projects.flatMap((p) => p.categories)))
  const q = query.trim().toLowerCase()
  const matchesQuery = (p: Project) => {
    if (!q) return true
    return (
      p.title.toLowerCase().includes(q) ||
      (p.titleRu ?? '').toLowerCase().includes(q) ||
      p.client.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q)
    )
  }
  const filtered = projects
    .filter((p) => filter === 'all' || p.categories.includes(filter as ProjectCategory))
    .filter(matchesQuery)
  const featured = projects.filter((p) => p.featured).length
  const drafts   = projects.filter((p) => p.status === 'draft').length
  const dragEnabled = filter === 'all' && !q

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Projects</h1>
          {!loading && (
            <p className="text-sm text-[#555] mt-1">
              {projects.length} total · {featured} featured{drafts > 0 && ` · ${drafts} draft${drafts === 1 ? '' : 's'}`}
              {savingOrder && <span className="ml-2 text-[#C8FF47]">· saving order…</span>}
            </p>
          )}
        </div>
        <Link
          href="/admin/projects/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#C8FF47] text-[#0A0A0A] font-bold rounded-lg text-sm hover:bg-[#F0EEE6] transition-colors"
        >
          <span className="text-base leading-none">+</span> New project
        </Link>
      </div>

      {/* Search + category filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-3">
        <div className="relative lg:w-80">
          <input
            type="search"
            placeholder="Search by title, client, slug…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#111] border border-[#252525] rounded-lg px-3 py-2 pr-8 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#C8FF47] transition-colors"
            aria-label="Search projects"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#555] hover:text-white"
            >
              ×
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === cat
                  ? 'border-[#C8FF47] text-[#C8FF47] bg-[#C8FF47]/10'
                  : 'border-[#252525] text-[#555] hover:border-[#333] hover:text-[#888]'
              }`}
            >
              {cat === 'all' ? `All (${projects.length})` : CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-[#444] mb-5">
        {dragEnabled
          ? 'Drag the ⋮⋮ handle to reorder projects. Order is applied on the public site.'
          : 'Clear search and switch to "All" to reorder projects.'}
      </p>

      {/* Table */}
      <div className="rounded-xl border border-[#1E1E1E] overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid grid-cols-[28px_1fr_130px_56px_70px_90px_120px] gap-4 px-5 py-3 bg-[#0D0D0D] border-b border-[#1E1E1E]">
          <span />
          {['Project', 'Category', 'Year', 'Featured', 'Views', 'Actions'].map((h) => (
            <span key={h} className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#444]">{h}</span>
          ))}
        </div>

        {loading && (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-[#0D0D0D] animate-pulse" />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-[#444] mb-3">
              {filter === 'all' ? 'No projects yet.' : 'No projects in this category.'}
            </p>
            {filter === 'all' && (
              <Link href="/admin/projects/new" className="text-sm text-[#C8FF47] hover:underline">
                Add your first project →
              </Link>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && dragEnabled && (
          <Reorder.Group
            axis="y"
            values={projects}
            onReorder={handleReorder}
            as="div"
          >
            {projects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                draggable
                views={views[project.slug]}
                onDelete={handleDelete}
              />
            ))}
          </Reorder.Group>
        )}

        {!loading && filtered.length > 0 && !dragEnabled && filtered.map((project) => (
          <ProjectRow
            key={project.id}
            project={project}
            draggable={false}
            views={views[project.slug]}
            onDelete={handleDelete}
          />
        ))}

        {!loading && filtered.length === 0 && projects.length > 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-[#444]">No projects match your search.</p>
            <button
              type="button"
              onClick={() => { setQuery(''); setFilter('all') }}
              className="text-xs text-[#C8FF47] hover:underline mt-2"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ProjectRow({
  project,
  draggable,
  views,
  onDelete,
}: {
  project: Project
  draggable: boolean
  views?: Views
  onDelete: (id: string, title: string) => void
}) {
  const controls = useDragControls()
  const total = views?.total ?? 0
  const week  = views?.week  ?? 0

  const Inner = (
    <div className="flex md:grid md:grid-cols-[28px_1fr_130px_56px_70px_90px_120px] gap-4 items-center px-5 py-4 border-b border-[#1A1A1A] last:border-b-0 bg-[#080808] hover:bg-[#0D0D0D] transition-colors group">
      {draggable ? (
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className="cursor-grab active:cursor-grabbing touch-none text-[#444] hover:text-[#C8FF47] transition-colors select-none text-lg leading-none"
          aria-label="Drag to reorder"
          title="Drag to reorder"
        >
          ⋮⋮
        </button>
      ) : (
        <span className="hidden md:block" />
      )}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-1 h-9 rounded-full flex-shrink-0" style={{ background: project.accentColor ?? '#C8FF47' }} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white truncate">{project.title}</p>
            {project.status === 'draft' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-300 tracking-wider uppercase">
                Draft
              </span>
            )}
          </div>
          <p className="text-xs text-[#444] mt-0.5">{project.client}</p>
        </div>
      </div>
      <span className="hidden md:block text-xs px-2.5 py-1 border border-[#252525] rounded-full text-[#555] whitespace-nowrap w-fit">
        {project.categories.map((c) => CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c).join(', ')}
      </span>
      <span className="hidden md:block text-xs text-[#444]">{project.year}</span>
      <div className="hidden md:flex items-center">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          project.featured
            ? 'text-[#C8FF47] bg-[#C8FF47]/10'
            : 'text-[#333] bg-[#1A1A1A]'
        }`}>
          {project.featured ? 'Yes' : 'No'}
        </span>
      </div>
      <div className="hidden md:block text-xs tabular-nums" title="All time · last 7 days">
        <p className="text-white font-semibold leading-tight">{total.toLocaleString('en-US')}</p>
        <p className="text-[10px] text-[#555] mt-0.5">{week} / week</p>
      </div>
      <div className="flex gap-3 ml-auto md:ml-0">
        <a
          href={`/portfolio/${project.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#555] hover:text-[#47C8FF] transition-colors"
          title="Open public page in new tab"
        >
          Preview
        </a>
        <Link
          href={`/admin/edit/${project.id}`}
          className="text-xs text-[#555] hover:text-[#C8FF47] transition-colors"
        >
          Edit
        </Link>
        <button
          onClick={() => onDelete(project.id, project.title)}
          className="text-xs text-[#555] hover:text-red-400 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )

  if (!draggable) return Inner

  return (
    <Reorder.Item
      value={project}
      dragListener={false}
      dragControls={controls}
      as="div"
      whileDrag={{
        scale: 1.01,
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        zIndex: 10,
      }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
    >
      {Inner}
    </Reorder.Item>
  )
}
