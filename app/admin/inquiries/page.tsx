'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import type { Inquiry } from '@/lib/inquiries'

type FilterKey = 'all' | 'unread' | 'read'

function fmt(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

export default function InquiriesPage() {
  const [items,    setItems]    = useState<Inquiry[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<Inquiry | null>(null)
  const [filter,   setFilter]   = useState<FilterKey>('all')
  const [query,    setQuery]    = useState('')
  const [picked,   setPicked]   = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/inquiries', { cache: 'no-store' })
      if (!res.ok) throw new Error()
      setItems(await res.json())
    } catch {
      toast.error('Failed to load inquiries')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const open = async (item: Inquiry) => {
    setSelected(item)
    if (!item.read) {
      await fetch('/api/inquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      })
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, read: true } : i))
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this inquiry?')) return
    await fetch(`/api/inquiries?id=${id}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((i) => i.id !== id))
    setPicked((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    if (selected?.id === id) setSelected(null)
    toast.success('Deleted')
  }

  const bulkDelete = async () => {
    if (picked.size === 0) return
    if (!confirm(`Delete ${picked.size} inquiries? This cannot be undone.`)) return
    const ids = Array.from(picked)
    try {
      const res = await fetch('/api/inquiries', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error()
      setItems((prev) => prev.filter((i) => !picked.has(i.id)))
      if (selected && picked.has(selected.id)) setSelected(null)
      setPicked(new Set())
      toast.success(`Deleted ${ids.length} inquiries`)
    } catch {
      toast.error('Bulk delete failed')
    }
  }

  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => items.filter((i) => {
    if (filter === 'read'   && !i.read) return false
    if (filter === 'unread' &&  i.read) return false
    if (!q) return true
    return (
      i.name.toLowerCase().includes(q) ||
      i.email.toLowerCase().includes(q) ||
      i.message.toLowerCase().includes(q) ||
      (i.company ?? '').toLowerCase().includes(q) ||
      i.service.toLowerCase().includes(q)
    )
  }), [items, filter, q])

  const unread = items.filter((i) => !i.read).length
  const allSelectedHere = filtered.length > 0 && filtered.every((i) => picked.has(i.id))

  const toggleSelect = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleSelectAllVisible = () =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (allSelectedHere) filtered.forEach((i) => next.delete(i.id))
      else filtered.forEach((i) => next.add(i.id))
      return next
    })

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="w-[380px] flex-shrink-0 border-r border-[#1E1E1E] flex flex-col h-[calc(100vh-0px)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1E1E1E] flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-semibold text-white">Inquiries</h1>
            {unread > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C8FF47]/15 text-[#C8FF47]">
                {unread} new
              </span>
            )}
          </div>

          <div className="relative">
            <input
              type="search"
              placeholder="Search name, email, message…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#111] border border-[#252525] rounded-lg px-3 py-2 pr-7 text-xs text-white placeholder:text-[#444] focus:outline-none focus:border-[#C8FF47] transition-colors"
              aria-label="Search inquiries"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#555] hover:text-white text-xs"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {(['all', 'unread', 'read'] as const).map((f) => {
              const active = filter === f
              const count = f === 'all' ? items.length : f === 'unread' ? unread : items.length - unread
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`flex-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    active
                      ? 'bg-[#C8FF47]/10 text-[#C8FF47]'
                      : 'text-[#555] hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : 'Read'} ({count})
                </button>
              )
            })}
          </div>

          {picked.size > 0 && (
            <div className="flex items-center justify-between px-2 py-2 bg-[#141414] border border-[#1E1E1E] rounded-lg">
              <span className="text-xs text-[#aaa]">{picked.size} selected</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPicked(new Set())}
                  className="text-[11px] text-[#555] hover:text-white"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={bulkDelete}
                  className="text-[11px] font-semibold text-red-400 hover:text-red-300"
                >
                  Delete {picked.size}
                </button>
              </div>
            </div>
          )}

          {filtered.length > 0 && (
            <label className="flex items-center gap-2 text-[11px] text-[#555] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelectedHere}
                onChange={toggleSelectAllVisible}
                className="accent-maze-lime"
              />
              Select visible
            </label>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-[#141414] animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center px-6">
              <p className="text-2xl mb-3">{items.length === 0 ? '✉️' : '🔍'}</p>
              <p className="text-sm text-[#555]">
                {items.length === 0 ? 'No inquiries yet.' : 'Nothing matches your filters.'}
              </p>
              {items.length === 0 && (
                <p className="text-xs text-[#333] mt-1">Form submissions will appear here.</p>
              )}
            </div>
          ) : (
            filtered.map((item) => {
              const isPicked = picked.has(item.id)
              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-2 px-3 py-4 border-b border-[#1A1A1A] transition-colors hover:bg-[#111] ${
                    selected?.id === item.id ? 'bg-[#111] border-l-2 border-l-[#C8FF47]' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isPicked}
                    onChange={() => toggleSelect(item.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select inquiry from ${item.name}`}
                    className="mt-1 accent-maze-lime"
                  />
                  <button
                    onClick={() => open(item)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white truncate flex-1 mr-2">{item.name}</span>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-[#C8FF47] flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-[#555] truncate">{item.service || item.message}</p>
                    <p className="text-[10px] text-[#333] mt-1">{fmt(item.createdAt)}</p>
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-4xl mb-4">📬</p>
              <p className="text-sm text-[#444]">Select an inquiry to read</p>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl px-8 py-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-white">{selected.name}</h2>
                <p className="text-sm text-[#555] mt-1">{fmt(selected.createdAt)}</p>
              </div>
              <button
                onClick={() => remove(selected.id)}
                className="px-3 py-1.5 rounded-lg border border-[#2A2A2A] text-xs text-[#555] hover:border-red-500/50 hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            </div>

            {/* Fields */}
            <div className="space-y-5">
              {[
                { label: 'Email',   value: selected.email,   href: `mailto:${selected.email}` },
                { label: 'Company', value: selected.company  },
                { label: 'Service', value: selected.service  },
                { label: 'Budget',  value: selected.budget   },
              ].filter((f) => f.value).map((f) => (
                <div key={f.label}>
                  <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#444] mb-1">{f.label}</p>
                  {f.href ? (
                    <a href={f.href} className="text-sm text-[#C8FF47] hover:underline">{f.value}</a>
                  ) : (
                    <p className="text-sm text-[#aaa]">{f.value}</p>
                  )}
                </div>
              ))}

              <div>
                <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#444] mb-2">Message</p>
                <p className="text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5">
                  {selected.message}
                </p>
              </div>

              <div className="pt-4">
                <a
                  href={`mailto:${selected.email}?subject=Re: ${selected.service || 'Your inquiry'}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C8FF47] text-[#0A0A0A] font-bold text-sm rounded-lg hover:bg-[#d4ff5c] transition-colors"
                >
                  Reply by email ↗
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
