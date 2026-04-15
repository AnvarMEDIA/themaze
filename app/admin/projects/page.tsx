'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import type { Project } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<string>('all')

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

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    const prev = projects
    setProjects((p) => p.filter((x) => x.id !== id))
    try {
      const res = await fetch(`/api/portfolio/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Project deleted')
    } catch {
      setProjects(prev)
      toast.error('Delete failed')
    }
  }

  const categories = Array.from(new Set(projects.map((p) => p.category)))
  const filtered = filter === 'all' ? projects : projects.filter((p) => p.category === filter)
  const featured = projects.filter((p) => p.featured).length

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Projects</h1>
          {!loading && (
            <p className="text-sm text-[#555] mt-1">
              {projects.length} total · {featured} featured
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

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-6">
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

      {/* Table */}
      <div className="rounded-xl border border-[#1E1E1E] overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid grid-cols-[1fr_140px_60px_90px_90px] gap-4 px-5 py-3 bg-[#0D0D0D] border-b border-[#1E1E1E]">
          {['Project', 'Category', 'Year', 'Featured', 'Actions'].map((h) => (
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

        {!loading && filtered.map((project) => (
          <div
            key={project.id}
            className="flex md:grid md:grid-cols-[1fr_140px_60px_90px_90px] gap-4 items-center px-5 py-4 border-b border-[#1A1A1A] last:border-b-0 hover:bg-[#0D0D0D] transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-1 h-9 rounded-full flex-shrink-0" style={{ background: project.accentColor ?? '#C8FF47' }} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{project.title}</p>
                <p className="text-xs text-[#444] mt-0.5">{project.client}</p>
              </div>
            </div>
            <span className="hidden md:block text-xs px-2.5 py-1 border border-[#252525] rounded-full text-[#555] whitespace-nowrap w-fit">
              {CATEGORY_LABELS[project.category]}
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
            <div className="flex gap-3 ml-auto md:ml-0">
              <Link
                href={`/admin/edit/${project.id}`}
                className="text-xs text-[#555] hover:text-[#C8FF47] transition-colors"
              >
                Edit
              </Link>
              <button
                onClick={() => handleDelete(project.id, project.title)}
                className="text-xs text-[#555] hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
