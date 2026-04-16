'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import type { Inquiry } from '@/lib/inquiries'

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
    if (selected?.id === id) setSelected(null)
    toast.success('Deleted')
  }

  const unread = items.filter((i) => !i.read).length

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="w-[340px] flex-shrink-0 border-r border-[#1E1E1E] flex flex-col h-[calc(100vh-0px)] overflow-hidden">
        <div className="px-5 py-5 border-b border-[#1E1E1E] flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-sm font-semibold text-white">Inquiries</h1>
            {unread > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C8FF47]/15 text-[#C8FF47]">
                {unread} new
              </span>
            )}
          </div>
          <p className="text-xs text-[#444]">{items.length} total messages</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-[#141414] animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center px-6">
              <p className="text-2xl mb-3">✉️</p>
              <p className="text-sm text-[#555]">No inquiries yet.</p>
              <p className="text-xs text-[#333] mt-1">Form submissions will appear here.</p>
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => open(item)}
                className={`w-full text-left px-5 py-4 border-b border-[#1A1A1A] transition-colors hover:bg-[#111] ${
                  selected?.id === item.id ? 'bg-[#111] border-l-2 border-l-[#C8FF47]' : ''
                }`}
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
            ))
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
