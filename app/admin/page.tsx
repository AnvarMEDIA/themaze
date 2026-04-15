'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import type { Project } from '@/lib/types'
import type { Partner } from '@/lib/partners'
import { CATEGORY_LABELS } from '@/lib/utils'

export default function AdminDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    try {
      const [pRes, partRes] = await Promise.all([
        fetch('/api/portfolio',  { cache: 'no-store' }),
        fetch('/api/partners',   { cache: 'no-store' }),
      ])
      const [pData, partData] = await Promise.all([pRes.json(), partRes.json()])
      setProjects(pData)
      setPartners(partData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const featured    = projects.filter((p) => p.featured).length
  const categories  = Array.from(new Set(projects.map((p) => p.category)))
  const recentProjects = [...projects]
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    .slice(0, 5)

  const stats = [
    { label: 'Total Projects', value: projects.length, icon: '◈', href: '/admin/projects', color: '#C8FF47' },
    { label: 'Featured',       value: featured,         icon: '★', href: '/admin/projects', color: '#FFD447' },
    { label: 'Partners',       value: partners.length,  icon: '◎', href: '/admin/partners', color: '#47C8FF' },
    { label: 'Categories',     value: categories.length,icon: '⬡', href: '/admin/projects', color: '#FF6B47' },
  ]

  return (
    <div className="px-8 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-sm text-[#555] mt-1">Welcome back — here's what's happening.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group relative p-5 rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] hover:border-[#2A2A2A] transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-xl" style={{ color: stat.color }}>{stat.icon}</span>
              <svg className="opacity-0 group-hover:opacity-100 transition-opacity" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 12L12 2M12 2H5M12 2V9" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            {loading ? (
              <div className="h-8 w-12 bg-[#1A1A1A] rounded animate-pulse mb-1" />
            ) : (
              <p className="text-3xl font-bold text-white tabular-nums">{stat.value}</p>
            )}
            <p className="text-xs text-[#555] mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Recent projects */}
        <div className="xl:col-span-2 rounded-xl bg-[#0D0D0D] border border-[#1E1E1E]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E1E]">
            <h2 className="text-sm font-semibold text-white">Recent Projects</h2>
            <Link href="/admin/projects" className="text-xs text-[#555] hover:text-[#C8FF47] transition-colors">
              View all →
            </Link>
          </div>
          <div>
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-[#141414] animate-pulse" />
                ))}
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-[#444]">No projects yet.</p>
                <Link href="/admin/projects/new" className="text-xs text-[#C8FF47] hover:underline mt-2 inline-block">
                  Add your first project →
                </Link>
              </div>
            ) : (
              recentProjects.map((project, i) => (
                <div
                  key={project.id}
                  className="flex items-center gap-4 px-5 py-3.5 border-b border-[#1A1A1A] last:border-b-0 hover:bg-[#111] transition-colors"
                >
                  {/* Color dot */}
                  <div
                    className="w-1.5 h-8 rounded-full flex-shrink-0"
                    style={{ background: project.accentColor ?? '#C8FF47' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{project.title}</p>
                    <p className="text-xs text-[#444] mt-0.5">{project.client} · {project.year}</p>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full border border-[#252525] text-[#555] hidden sm:block whitespace-nowrap">
                    {CATEGORY_LABELS[project.category]}
                  </span>
                  <div className="flex items-center gap-3">
                    {project.featured && (
                      <span className="text-[10px] font-semibold text-[#C8FF47] bg-[#C8FF47]/10 px-2 py-0.5 rounded-full">
                        Featured
                      </span>
                    )}
                    <Link
                      href={`/admin/edit/${project.id}`}
                      className="text-xs text-[#444] hover:text-[#C8FF47] transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Quick actions */}
          <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { href: '/admin/projects/new', label: 'Add new project',  icon: '+', color: '#C8FF47' },
                { href: '/admin/partners',     label: 'Manage partners',  icon: '◎', color: '#47C8FF' },
                { href: '/admin/settings',     label: 'Site settings',    icon: '⚙', color: '#FFD447' },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg bg-[#111] border border-[#1E1E1E] hover:border-[#2A2A2A] hover:bg-[#161616] transition-all duration-150 group"
                >
                  <span className="w-7 h-7 flex items-center justify-center rounded-md text-sm font-bold"
                    style={{ color: action.color, background: `${action.color}15` }}>
                    {action.icon}
                  </span>
                  <span className="text-sm text-[#888] group-hover:text-white transition-colors">{action.label}</span>
                  <svg className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 10L10 2M10 2H4M10 2V8" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          {/* Partners mini-list */}
          <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E1E]">
              <h2 className="text-sm font-semibold text-white">Partners</h2>
              <Link href="/admin/partners" className="text-xs text-[#555] hover:text-[#47C8FF] transition-colors">
                Manage →
              </Link>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-8 rounded bg-[#141414] animate-pulse" />
                  ))}
                </div>
              ) : partners.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs text-[#444]">No partners added yet.</p>
                  <Link href="/admin/partners" className="text-xs text-[#47C8FF] hover:underline mt-1 inline-block">
                    Add partners →
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {partners.slice(0, 5).map((partner) => (
                    <div key={partner.id} className="flex items-center gap-3 py-2">
                      <div className="w-2 h-2 rounded-full bg-[#47C8FF]/50 flex-shrink-0" />
                      <span className="text-sm text-[#888]">{partner.name}</span>
                    </div>
                  ))}
                  {partners.length > 5 && (
                    <p className="text-xs text-[#444] pt-1">+{partners.length - 5} more</p>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
