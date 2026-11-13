'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Reorder, useDragControls, useReducedMotion } from 'framer-motion'
import type { Project, ProjectCategory } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/utils'
import toast from 'react-hot-toast'
import { showUndoToast } from '@/components/admin/UndoToast'

type Views = { total: number; week: number }
type MoveDir = 'earlier' | 'later'

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [views,    setViews]    = useState<Record<string, Views>>({})
  // Whether the counts came in: until they do, or if they cannot, a card says "—", not 0.
  const [viewsKnown, setViewsKnown] = useState(false)
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

  // Each project page's views of all time and of the last 7 days
  // (lib/stats/store, readPageViews): the cards' chips and the "Week views"
  // KPI. A failure must not break the grid, and must not pass for 0 views.
  const loadViews = useCallback(async () => {
    try {
      const res  = await fetch('/api/analytics/pages', { cache: 'no-store' })
      if (!res.ok) { setViewsKnown(false); return }
      const data = await res.json() as { pages?: Record<string, Views> }
      const next: Record<string, Views> = {}
      for (const [path, counts] of Object.entries(data.pages ?? {})) {
        if (path.startsWith('/portfolio/')) next[path.slice('/portfolio/'.length)] = counts
      }
      setViews(next)
      setViewsKnown(true)
    } catch {
      setViewsKnown(false)
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

  // The arrows on a card: one place earlier or later, saved like a drag.
  // The card's DOM node moves, which drops the focus; it is put back on the
  // same arrow (the other one at an end), so a few presses walk the card
  // along, and the new place is read out.
  const [focusAfterMove, setFocusAfterMove] = useState<{ id: string; dir: MoveDir } | null>(null)
  const [moveNote, setMoveNote] = useState('')
  const move = (id: string, dir: MoveDir) => {
    const from = projects.findIndex((p) => p.id === id)
    const to = dir === 'earlier' ? from - 1 : from + 1
    if (from < 0 || to < 0 || to >= projects.length) return
    const next = [...projects]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    handleReorder(next)
    setFocusAfterMove({ id, dir })
    setMoveNote(`${moved.title}: position ${to + 1} of ${next.length}`)
  }
  useEffect(() => {
    if (!focusAfterMove) return
    const { id, dir } = focusAfterMove
    const same = document.getElementById(`move-${dir}-${id}`) as HTMLButtonElement | null
    const other = document.getElementById(`move-${dir === 'earlier' ? 'later' : 'earlier'}-${id}`)
    ;(same && !same.disabled ? same : other)?.focus()
    setFocusAfterMove(null)
  }, [focusAfterMove])

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
            ? 'Reorder: drag ⋮⋮ or use the arrows · new projects go first · ★ featured · views: all time, +N wk: the last 7 days · admin self-views excluded.'
            : 'Clear search and switch to "All" to reorder.'}
        </p>
        <p className="sr-only" aria-live="polite">{moveNote}</p>
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

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-[#0D0D0D] border border-[#1E1E1E] overflow-hidden">
              <div className="aspect-[16/9] bg-[#111] animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-3/4 rounded bg-[#1A1A1A] animate-pulse" />
                <div className="h-4 w-1/2 rounded bg-[#141414] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty — no projects at all */}
      {!loading && projects.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#252525] py-24 text-center">
          <p className="text-4xl mb-4" aria-hidden="true">✦</p>
          <p className="text-lg text-white font-semibold mb-2">No projects yet</p>
          <p className="text-sm text-[#666] mb-6 max-w-sm mx-auto">
            Create your first case study to populate the portfolio. You can come back any time to add more.
          </p>
          <Link
            href="/admin/projects/new"
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#C8FF47] text-[#0A0A0A] font-bold rounded-lg text-sm hover:bg-[#F0EEE6] transition-colors"
          >
            + New project
          </Link>
        </div>
      )}

      {/* Empty — filtered to nothing */}
      {!loading && projects.length > 0 && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#252525] py-20 text-center">
          <p className="text-sm text-white mb-1">No projects match your filters.</p>
          <button
            type="button"
            onClick={() => { setQuery(''); setFilter('all') }}
            className="text-xs text-[#C8FF47] hover:underline mt-2"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Card grid — drag-and-drop enabled when filter is "all" + no search */}
      {!loading && filtered.length > 0 && dragEnabled && (
        <Reorder.Group
          axis="y"
          values={projects}
          onReorder={handleReorder}
          as="div"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {projects.map((project, i) => (
            <ProjectCard
              key={project.id}
              project={project}
              draggable
              place={{ position: i + 1, count: projects.length, onMove: (dir) => move(project.id, dir) }}
              views={viewsKnown ? views[project.slug] ?? { total: 0, week: 0 } : undefined}
              onDelete={handleDelete}
            />
          ))}
        </Reorder.Group>
      )}

      {/* Filtered grid — no drag */}
      {!loading && filtered.length > 0 && !dragEnabled && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              draggable={false}
              views={viewsKnown ? views[project.slug] ?? { total: 0, week: 0 } : undefined}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
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

/* ── Project Card ────────────────────────────────────────────────────── */

/**
 * One place earlier or later. Left and right where cards run in rows; on a
 * phone, one card to a row, the same arrows point up and down.
 */
function MoveButton({ id, dir, title, disabled, onClick }: {
  id: string
  dir: MoveDir
  title: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Move ${title} ${dir}`}
      title={dir === 'earlier' ? 'Move earlier' : 'Move later'}
      className="grid h-8 w-8 place-items-center rounded-lg border border-[#252525] text-[#888] transition-[color,border-color,transform] duration-150 ease-out hover:border-[#444] hover:text-white active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8FF47]/60 disabled:pointer-events-none disabled:opacity-30"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="rotate-90 sm:rotate-0">
        <path
          d={dir === 'earlier' ? 'M7.5 2.5 4 6l3.5 3.5' : 'M4.5 2.5 8 6 4.5 9.5'}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

function ProjectCard({
  project,
  draggable,
  place,
  views,
  onDelete,
}: {
  project: Project
  draggable: boolean
  /** Its place in the whole list and the arrows that change it; absent while the list is filtered. */
  place?: { position: number; count: number; onMove: (dir: MoveDir) => void }
  views?: Views
  onDelete: (id: string, title: string) => void
}) {
  const controls = useDragControls()
  const reduceMotion = useReducedMotion()
  // views is undefined until the counts come in, or when they could not.
  const total    = views?.total ?? 0
  const week     = views?.week  ?? 0
  const accent   = project.accentColor || '#C8FF47'
  const isDraft  = project.status === 'draft'

  const categoryLabels = project.categories.map(
    (c) => CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c,
  )
  const firstCategory = categoryLabels[0] ?? '—'
  const moreCategories = categoryLabels.slice(1)

  const Card = (
    <article
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-[#0D0D0D] border border-[#1E1E1E] hover:border-[#333] transition-all duration-200 hover:shadow-2xl hover:-translate-y-0.5"
    >
      {/* Cover */}
      <Link
        href={`/admin/edit/${project.id}`}
        aria-label={`Edit ${project.title}`}
        className="relative aspect-[16/9] block bg-[#1A1A1A] overflow-hidden"
        style={{ backgroundColor: `${accent}1A` }}
      >
        {project.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.coverImage}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <span
            className="absolute inset-0 flex items-center justify-center text-5xl font-black tracking-wide opacity-60"
            style={{ color: accent }}
            aria-hidden="true"
          >
            {project.title.slice(0, 2).toUpperCase()}
          </span>
        )}

        {/* Top-left: drag handle */}
        {draggable && (
          <button
            type="button"
            onPointerDown={(e) => { e.preventDefault(); controls.start(e) }}
            onClick={(e) => e.preventDefault()}
            className="absolute top-3 left-3 w-8 h-8 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-sm text-[#C8FF47] cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:opacity-100"
            aria-label={`Drag ${project.title} to reorder`}
            title="Drag to reorder"
          >
            ⋮⋮
          </button>
        )}

        {/* Top-right: status badges */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {project.featured && (
            <span
              aria-label="Featured on homepage"
              title="Featured on homepage"
              className="w-7 h-7 flex items-center justify-center rounded-md bg-[#C8FF47] text-[#0A0A0A] text-xs font-bold"
            >
              ★
            </span>
          )}
          {isDraft && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-yellow-400/90 text-[#0A0A0A] tracking-wider uppercase">
              Draft
            </span>
          )}
        </div>

        {/* Bottom-left: views chip — visible always for at-a-glance scanning */}
        <div
          className="absolute bottom-3 left-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm text-xs text-white tabular-nums"
          title={views
            ? `All-time views: ${total.toLocaleString('en-US')} · last 7 days: +${week.toLocaleString('en-US')}`
            : 'View counts not loaded'}
        >
          <span className="font-semibold">{views ? total.toLocaleString('en-US') : '—'}</span>
          <span className="text-[#888]">{views && total === 1 ? 'view' : 'views'}</span>
          {week > 0 && (
            <>
              <span className="text-[#444]" aria-hidden="true">·</span>
              <span className="text-[#C8FF47]">+{week} wk</span>
            </>
          )}
        </div>
      </Link>

      {/* Body */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">{project.title}</h3>
          <p className="text-sm text-[#999] truncate mt-0.5">{project.client}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs mt-auto">
          <span
            className="px-2.5 py-1 border border-[#252525] rounded-full text-[#aaa]"
            title={categoryLabels.join(', ')}
          >
            {firstCategory}
            {moreCategories.length > 0 && (
              <span className="text-[#666] ml-1">+{moreCategories.length}</span>
            )}
          </span>
          <span className="text-[#444]" aria-hidden="true">·</span>
          <span className="text-[#888] tabular-nums">{project.year}</span>
          {place && (
            <div role="group" aria-label={`Place of ${project.title}`} className="ml-auto flex items-center gap-1.5">
              <MoveButton
                id={`move-earlier-${project.id}`}
                dir="earlier"
                title={project.title}
                disabled={place.position === 1}
                onClick={() => place.onMove('earlier')}
              />
              <span className="min-w-[2ch] text-center text-[#888] tabular-nums" title={`Place ${place.position} of ${place.count}`}>
                {place.position}
              </span>
              <MoveButton
                id={`move-later-${project.id}`}
                dir="later"
                title={project.title}
                disabled={place.position === place.count}
                onClick={() => place.onMove('later')}
              />
            </div>
          )}
        </div>
      </div>

      {/* Action footer — 4 big tap targets */}
      <div className="grid grid-cols-4 border-t border-[#1E1E1E] divide-x divide-[#1E1E1E]">
        <a
          href={`/portfolio/${project.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="py-3 text-[11px] font-semibold tracking-wide uppercase text-[#888] hover:text-[#47C8FF] hover:bg-[#111] transition-colors text-center"
          title="Open public page in new tab"
        >
          Preview
        </a>
        <Link
          href={`/admin/projects/${project.id}/press-kit`}
          className="py-3 text-[11px] font-semibold tracking-wide uppercase text-[#888] hover:text-[#C8FF47] hover:bg-[#111] transition-colors text-center"
          title="Captions, share links, submit URLs"
        >
          Promote
        </Link>
        <Link
          href={`/admin/edit/${project.id}`}
          className="py-3 text-[11px] font-semibold tracking-wide uppercase text-[#C8FF47] hover:bg-[#C8FF47]/10 transition-colors text-center"
          title="Edit project"
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={() => onDelete(project.id, project.title)}
          className="py-3 text-[11px] font-semibold tracking-wide uppercase text-[#888] hover:text-red-400 hover:bg-red-500/5 transition-colors"
          title="Delete project"
        >
          Delete
        </button>
      </div>
    </article>
  )

  if (!draggable) return Card

  return (
    <Reorder.Item
      value={project}
      dragListener={false}
      dragControls={controls}
      as="div"
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
        zIndex: 10,
      }}
      // A card moved by its arrows slides to its new place; with reduced motion it is simply there.
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }}
    >
      {Card}
    </Reorder.Item>
  )
}
