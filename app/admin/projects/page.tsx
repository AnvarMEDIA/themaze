'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
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
  const [refreshingViews, setRefreshingViews] = useState(false)
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

  // Pull pageview stats — populates the "Views" column and the
  // "Week views" KPI card. Failures here must not break the table.
  const loadViews = useCallback(async () => {
    try {
      const res  = await fetch('/api/analytics', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json() as { daily?: Record<string, Record<string, number>> }
      if (!data?.daily) return
      const weekStart = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10)
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
    } catch {
      /* swallow */
    }
  }, [])

  useEffect(() => { void loadViews() }, [loadViews])

  const refreshViews = async () => {
    setRefreshingViews(true)
    try { await loadViews() } finally { setRefreshingViews(false) }
  }

  const handleDelete = async (id: string, title: string) => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
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

  const categories = useMemo(
    () => Array.from(new Set(projects.flatMap((p) => p.categories))),
    [projects],
  )
  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => projects
    .filter((p) => filter === 'all' || p.categories.includes(filter as ProjectCategory))
    .filter((p) => !q || (
      p.title.toLowerCase().includes(q) ||
      (p.titleRu ?? '').toLowerCase().includes(q) ||
      p.client.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q)
    )),
    [projects, filter, q],
  )

  const featured       = projects.filter((p) => p.featured).length
  const drafts         = projects.filter((p) => p.status === 'draft').length
  const dragEnabled    = filter === 'all' && !q
  const weekViewsTotal = Object.values(views).reduce((s, v) => s + v.week, 0)

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Projects</h1>
          <p className="text-sm text-[#777] mt-1">
            Manage your portfolio. Drag to reorder, edit to update content, promote to share.
            {savingOrder && <span className="ml-2 text-[#C8FF47]">· saving order…</span>}
          </p>
        </div>
        <Link
          href="/admin/projects/new"
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-[#C8FF47] text-[#0A0A0A] font-bold rounded-lg text-sm hover:bg-[#F0EEE6] transition-colors"
        >
          <span className="text-base leading-none">+</span> New project
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total"      value={projects.length} loading={loading} />
        <KpiCard label="Drafts"     value={drafts}          loading={loading} accent={drafts   > 0 ? 'yellow' : undefined} />
        <KpiCard label="Featured"   value={featured}        loading={loading} accent={featured > 0 ? 'lime'   : undefined} />
        <KpiCard label="Week views" value={weekViewsTotal}  loading={loading} />
      </div>

      {/* Search + category filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-3">
        <div className="relative lg:w-80">
          <input
            type="search"
            placeholder="Search by title, client, slug…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#111] border border-[#252525] rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#C8FF47] transition-colors"
            aria-label="Search projects"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] text-sm" aria-hidden="true">⌕</span>
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#555] hover:text-white text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', ...categories].map((cat) => {
            const active = filter === cat
            const count  = cat === 'all'
              ? projects.length
              : projects.filter((p) => p.categories.includes(cat as ProjectCategory)).length
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? 'border-[#C8FF47] text-[#C8FF47] bg-[#C8FF47]/10'
                    : 'border-[#252525] text-[#555] hover:border-[#333] hover:text-[#888]'
                }`}
              >
                {cat === 'all' ? 'All' : CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]}
                <span className={`ml-1.5 tabular-nums ${active ? 'text-[#C8FF47]/70' : 'text-[#444]'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <p className="text-[11px] text-[#666]">
          {dragEnabled
            ? 'Drag ⋮⋮ to reorder · ★ marks featured · admin self-views excluded from counts.'
            : 'Clear search and switch to "All" to reorder.'}
        </p>
        <button
          type="button"
          onClick={refreshViews}
          disabled={refreshingViews}
          aria-label="Refresh view counts"
          className="self-start sm:self-auto text-[11px] px-2.5 py-1 rounded-full border border-[#252525] text-[#888] hover:text-white hover:border-[#444] transition-colors disabled:opacity-50"
        >
          {refreshingViews ? '↻ Refreshing…' : '↻ Refresh views'}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#1E1E1E] overflow-hidden">
        {loading && (
          <div className="p-3 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-[#0D0D0D] animate-pulse" />
            ))}
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-3xl mb-3" aria-hidden="true">✦</p>
            <p className="text-sm text-white font-semibold mb-1">No projects yet</p>
            <p className="text-xs text-[#555] mb-5">Create your first case study to populate the portfolio.</p>
            <Link
              href="/admin/projects/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#C8FF47] text-[#0A0A0A] font-bold rounded-lg text-sm hover:bg-[#F0EEE6] transition-colors"
            >
              + New project
            </Link>
          </div>
        )}

        {!loading && projects.length > 0 && filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-[#888]">No projects match your filters.</p>
            <button
              type="button"
              onClick={() => { setQuery(''); setFilter('all') }}
              className="text-xs text-[#C8FF47] hover:underline mt-2"
            >
              Clear filters
            </button>
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
      </div>
    </div>
  )
}

/* ── KPI Card ────────────────────────────────────────────────────────── */

function KpiCard({
  label, value, accent, loading,
}: {
  label:   string
  value:   number
  accent?: 'lime' | 'yellow'
  loading?: boolean
}) {
  const valueColor =
    accent === 'lime'   ? 'text-[#C8FF47]' :
    accent === 'yellow' ? 'text-yellow-300' :
                          'text-white'

  return (
    <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] px-4 py-3">
      <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#555] mb-1.5">
        {label}
      </p>
      {loading ? (
        <div className="h-7 w-12 rounded bg-[#1A1A1A] animate-pulse" />
      ) : (
        <p className={`text-2xl font-bold tabular-nums ${valueColor}`}>
          {value.toLocaleString('en-US')}
        </p>
      )}
    </div>
  )
}

/* ── Project Row ─────────────────────────────────────────────────────── */

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
  const total    = views?.total ?? 0
  const week     = views?.week  ?? 0
  const accent   = project.accentColor || '#C8FF47'
  const isDraft  = project.status === 'draft'

  const categoryLabels = project.categories.map(
    (c) => CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c,
  )
  const firstCategory = categoryLabels[0] ?? '—'
  const moreCategories = categoryLabels.slice(1)

  const Inner = (
    <div className="relative flex items-center gap-4 px-5 py-3.5 border-b border-[#1A1A1A] last:border-b-0 bg-[#080808] hover:bg-[#0D0D0D] transition-colors duration-150 group">
      {/* Accent left bar — appears on hover, picks up the project's brand colour */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 w-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: accent }}
      />

      {/* Drag handle */}
      {draggable ? (
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className="cursor-grab active:cursor-grabbing touch-none text-[#444] hover:text-[#C8FF47] focus:text-[#C8FF47] focus:outline-none transition-colors select-none text-lg leading-none shrink-0"
          aria-label={`Drag ${project.title} to reorder`}
          title="Drag to reorder"
        >
          ⋮⋮
        </button>
      ) : (
        <span className="hidden md:block w-3 shrink-0" />
      )}

      {/* Thumbnail */}
      <div
        className="relative w-16 h-9 rounded-md overflow-hidden shrink-0 ring-1 ring-[#1E1E1E]"
        style={{ background: `${accent}22` }}
      >
        {project.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.coverImage}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <span
            className="absolute inset-0 flex items-center justify-center text-[10px] font-black tracking-wide"
            style={{ color: accent }}
            aria-hidden="true"
          >
            {project.title.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      {/* Title block — title row + inline meta row (client · category · year) */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white truncate">{project.title}</p>
          {project.featured && (
            <span
              aria-label="Featured on homepage"
              title="Featured on homepage"
              className="text-[#C8FF47] text-xs leading-none shrink-0"
            >
              ★
            </span>
          )}
          {isDraft && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-300 tracking-wider uppercase shrink-0">
              Draft
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-[#7A7A7A] min-w-0">
          <span className="truncate">{project.client}</span>
          <span className="text-[#3A3A3A] shrink-0" aria-hidden="true">·</span>
          <span className="shrink-0" title={categoryLabels.join(', ')}>
            {firstCategory}
            {moreCategories.length > 0 && (
              <span className="text-[#5A5A5A] ml-1">+{moreCategories.length}</span>
            )}
          </span>
          <span className="text-[#3A3A3A] shrink-0" aria-hidden="true">·</span>
          <span className="tabular-nums shrink-0">{project.year}</span>
        </div>
      </div>

      {/* Views — compact two-line block */}
      <div
        className="hidden md:block text-right tabular-nums shrink-0 w-16"
        title="All time · last 7 days (admin self-views excluded)"
      >
        <p className="text-sm text-white font-semibold leading-tight">
          {total.toLocaleString('en-US')}
        </p>
        <p className="text-[10px] text-[#666] mt-0.5">
          {week} / wk
        </p>
      </div>

      {/* Actions — visible on row hover on desktop, always on mobile */}
      <div className="flex items-center gap-3 shrink-0 md:opacity-60 md:group-hover:opacity-100 transition-opacity">
        <a
          href={`/portfolio/${project.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#888] hover:text-[#47C8FF] transition-colors"
          title="Open public page in new tab"
        >
          Preview
        </a>
        <Link
          href={`/admin/projects/${project.id}/press-kit`}
          className="text-xs text-[#888] hover:text-[#C8FF47] transition-colors"
          title="Captions, share links, submit URLs"
        >
          Promote
        </Link>
        <Link
          href={`/admin/edit/${project.id}`}
          className="text-xs text-[#888] hover:text-[#C8FF47] transition-colors"
        >
          Edit
        </Link>
        <button
          onClick={() => onDelete(project.id, project.title)}
          className="text-xs text-[#888] hover:text-red-400 transition-colors"
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
        scale: 1.005,
        boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
        zIndex: 10,
      }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
    >
      {Inner}
    </Reorder.Item>
  )
}
