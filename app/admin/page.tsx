'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { AdminNav } from '@/components/admin/AdminNav'
import type { Project } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading,  setLoading]  = useState(true)

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
    setProjects((p) => p.filter((x) => x.id !== id))   // optimistic
    try {
      const res = await fetch(`/api/portfolio/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Project deleted')
    } catch {
      setProjects(prev)                                  // rollback
      toast.error('Delete failed')
    }
  }

  const featured = projects.filter((p) => p.featured).length

  return (
    <>
      <AdminNav />
      <div className="pt-20 px-6 md:px-10 py-10 min-h-screen">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#EDEBE3]">Portfolio</h1>
              {!loading && (
                <p className="text-sm text-[#5A5A5A] mt-1">
                  {projects.length} projects · {featured} featured
                </p>
              )}
            </div>
            <Link
              href="/admin/new"
              className="px-5 py-2.5 bg-[#C8FF47] text-[#080808] font-bold rounded-full text-xs tracking-widest uppercase hover:bg-white transition-colors"
            >
              + New project
            </Link>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-[#111] border border-[#252525] animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && projects.length === 0 && (
            <div className="text-center py-24 border border-dashed border-[#252525] rounded-xl">
              <p className="text-[#5A5A5A] mb-4">No projects yet.</p>
              <Link href="/admin/new" className="text-sm text-[#C8FF47] hover:underline">
                Add your first project →
              </Link>
            </div>
          )}

          {/* Projects table */}
          {!loading && projects.length > 0 && (
            <div className="border border-[#252525] rounded-xl overflow-hidden">
              {/* Header row */}
              <div className="hidden md:grid grid-cols-[1fr_140px_60px_80px_100px] gap-4 px-5 py-3 bg-[#111] border-b border-[#252525]">
                {['Project', 'Category', 'Year', 'Featured', 'Actions'].map((h) => (
                  <span key={h} className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#5A5A5A]">
                    {h}
                  </span>
                ))}
              </div>

              {/* Rows */}
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex md:grid md:grid-cols-[1fr_140px_60px_80px_100px] gap-4 items-center px-5 py-4 border-b border-[#252525] last:border-b-0 hover:bg-[#111] transition-colors"
                >
                  {/* Title */}
                  <div className="min-w-0">
                    <p className="font-semibold text-[#EDEBE3] truncate">{project.title}</p>
                    <p className="text-xs text-[#5A5A5A] mt-0.5">{project.client}</p>
                  </div>

                  {/* Category */}
                  <span className="hidden md:block text-xs px-2.5 py-1 border border-[#252525] rounded-full text-[#5A5A5A] whitespace-nowrap">
                    {CATEGORY_LABELS[project.category]}
                  </span>

                  {/* Year */}
                  <span className="hidden md:block text-xs text-[#5A5A5A]">{project.year}</span>

                  {/* Featured */}
                  <div className="hidden md:flex justify-center">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        project.featured ? 'bg-[#C8FF47]' : 'bg-[#252525]'
                      }`}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4 ml-auto md:ml-0">
                    <Link
                      href={`/admin/edit/${project.id}`}
                      className="text-xs text-[#5A5A5A] hover:text-[#C8FF47] transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(project.id, project.title)}
                      className="text-xs text-[#5A5A5A] hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tips */}
          <div className="mt-10 p-6 border border-[#252525] rounded-xl bg-[#111]">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#C8FF47] mb-3">
              Tips
            </p>
            <ul className="space-y-2 text-sm text-[#5A5A5A]">
              <li>• Upload images via the New/Edit project form (drag &amp; drop supported)</li>
              <li>• Images are stored in <code className="text-[#EDEBE3]">/public/portfolio/uploads/</code></li>
              <li>• For Vercel: set <code className="text-[#EDEBE3]">ADMIN_PASSWORD</code> and <code className="text-[#EDEBE3]">JWT_SECRET</code> in env vars</li>
              <li>• After adding projects locally, commit &amp; push → Vercel auto-deploys</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
