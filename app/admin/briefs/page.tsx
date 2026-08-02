'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import type { Brief } from '@/lib/briefs'

type FilterKey = 'all' | 'unread' | 'read'

const STYLE_LABELS: Record<string, string> = {
  bold:     'Bold & Powerful',
  minimal:  'Minimal & Clean',
  playful:  'Playful & Friendly',
  classic:  'Classic & Timeless',
  tech:     'Technical & Modern',
  luxury:   'Luxurious & Premium',
  organic:  'Organic & Natural',
  abstract: 'Abstract & Expressive',
}

const COLOR_PALETTES: Record<string, { label: string; swatches: string[] }> = {
  dark:    { label: 'Dark & Moody',       swatches: ['#0a0a0a', '#2a2a2a', '#4a4a4a'] },
  light:   { label: 'Light & Clean',      swatches: ['#ffffff', '#f5f0e8', '#e8e4dc'] },
  vibrant: { label: 'Vibrant & Electric', swatches: ['#ff3b5c', '#ff8c00', '#ffdc00'] },
  earthy:  { label: 'Earthy & Warm',      swatches: ['#c0522b', '#8b4513', '#d4a96a'] },
  natural: { label: 'Natural & Green',    swatches: ['#2d5a27', '#7daa6e', '#c5d9b0'] },
  mono:    { label: 'Monochrome',         swatches: ['#000000', '#888888', '#ffffff'] },
}

const SERVICE_LABELS: Record<string, string> = {
  branding:   'Branding',
  rebranding: 'Rebranding',
  identity:   'Visual Identity',
  naming:     'Naming',
  packaging:  'Packaging',
  'ui-ux':    'UI / UX Design',
  print:      'Print & Packaging',
  motion:     'Motion Design',
  strategy:   'Brand Strategy',
  unsure:     'Not sure yet',
}

function fmt(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

export default function BriefsPage() {
  const [items,    setItems]    = useState<Brief[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<Brief | null>(null)
  const [filter,   setFilter]   = useState<FilterKey>('all')
  const [query,    setQuery]    = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/brief', { cache: 'no-store' })
      if (!res.ok) throw new Error()
      setItems(await res.json())
    } catch {
      toast.error('Failed to load briefs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const open = async (item: Brief) => {
    setSelected(item)
    if (!item.read) {
      await fetch('/api/brief', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: item.id }),
      })
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, read: true } : i))
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this brief?')) return
    await fetch(`/api/brief?id=${id}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((i) => i.id !== id))
    if (selected?.id === id) setSelected(null)
    toast.success('Deleted')
  }

  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => items.filter((i) => {
    if (filter === 'read'   && !i.read) return false
    if (filter === 'unread' &&  i.read) return false
    if (!q) return true
    return (
      i.name.toLowerCase().includes(q) ||
      (i.email ?? '').toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      (i.company ?? '').toLowerCase().includes(q) ||
      i.services.some((s) => s.toLowerCase().includes(q))
    )
  }), [items, filter, q])

  const unread = items.filter((i) => !i.read).length

  return (
    <div className="flex h-screen">
      {/* List */}
      <div className="w-[380px] flex-shrink-0 border-r border-[#1E1E1E] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1E1E1E] flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-semibold text-white">Briefs</h1>
            {unread > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C8FF47]/15 text-[#C8FF47]">
                {unread} new
              </span>
            )}
          </div>

          <div className="relative">
            <input
              type="search"
              placeholder="Search name, email, project…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#111] border border-[#252525] rounded-lg px-3 py-2 pr-7 text-xs text-white placeholder:text-[#444] focus:outline-none focus:border-[#C8FF47] transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
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
              <p className="text-2xl mb-3">{items.length === 0 ? '📋' : '🔍'}</p>
              <p className="text-sm text-[#555]">
                {items.length === 0 ? 'No briefs yet.' : 'Nothing matches your filters.'}
              </p>
              {items.length === 0 && (
                <p className="text-xs text-[#333] mt-1">Client briefs will appear here.</p>
              )}
            </div>
          ) : (
            filtered.map((item) => {
              const primary = item.services[0]
                ? (SERVICE_LABELS[item.services[0]] ?? item.services[0])
                : item.description.slice(0, 60)
              return (
                <button
                  key={item.id}
                  onClick={() => open(item)}
                  className={`w-full text-left px-4 py-4 border-b border-[#1A1A1A] transition-colors hover:bg-[#111] ${
                    selected?.id === item.id ? 'bg-[#111] border-l-2 border-l-[#C8FF47]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white truncate flex-1 mr-2">{item.name}</span>
                    {!item.read && (
                      <span className="w-2 h-2 rounded-full bg-[#C8FF47] flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-[#555] truncate">
                    {item.company ? `${item.company} — ` : ''}{primary}
                  </p>
                  <p className="text-[10px] text-[#333] mt-1">{fmt(item.createdAt)}</p>
                </button>
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
              <p className="text-4xl mb-4">📋</p>
              <p className="text-sm text-[#444]">Select a brief to read</p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl px-8 py-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-white">{selected.name}</h2>
                {selected.company && (
                  <p className="text-sm text-[#aaa] mt-0.5">{selected.company}</p>
                )}
                <p className="text-xs text-[#555] mt-1">{fmt(selected.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={`/admin/briefs/${selected.id}/print`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-xs font-bold hover:bg-[#F0EEE6] transition-colors active:scale-[0.97]"
                  title="Open a printable A4 sheet and save it as PDF"
                >
                  <IconPdf />
                  PDF
                </a>
                <button
                  onClick={() => remove(selected.id)}
                  className="px-3 py-1.5 rounded-lg border border-[#2A2A2A] text-xs text-[#555] hover:border-red-500/50 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Contact */}
            <Section title="Contact">
              {selected.phone && (
                <Field label="Phone" href={`tel:${selected.phone}`} value={selected.phone} />
              )}
              {selected.email && (
                <Field label="Email" href={`mailto:${selected.email}`} value={selected.email} />
              )}
              {selected.website && (
                <Field
                  label="Website"
                  href={/^https?:\/\//.test(selected.website) ? selected.website : `https://${selected.website}`}
                  value={selected.website}
                />
              )}
            </Section>

            {/* Project */}
            <Section title="Project">
              {selected.services.length > 0 && (
                <div>
                  <Label>Services</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.services.map((s) => (
                      <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-[#1A1A1A] border border-[#252525] text-[#ccc]">
                        {SERVICE_LABELS[s] ?? s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <LongField label="Description" value={selected.description} />
              <LongField label="Goals" value={selected.goals} />
              <LongField label="Target audience" value={selected.audience} />
              <LongField label="Competitors / references" value={selected.competitors} />
            </Section>

            {/* Style */}
            {(selected.styles.length > 0 || selected.colors.length > 0 || selected.refLinks) && (
              <Section title="Visual direction">
                {selected.styles.length > 0 && (
                  <div>
                    <Label>Aesthetic</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.styles.map((s) => (
                        <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-[#C8FF47]/10 border border-[#C8FF47]/30 text-[#C8FF47]">
                          {STYLE_LABELS[s] ?? s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selected.colors.length > 0 && (
                  <div>
                    <Label>Colour mood</Label>
                    <div className="space-y-2">
                      {selected.colors.map((c) => {
                        const palette = COLOR_PALETTES[c]
                        return (
                          <div key={c} className="flex items-center gap-3">
                            <div className="flex gap-1">
                              {(palette?.swatches ?? []).map((hex, i) => (
                                <div
                                  key={i}
                                  className="w-5 h-5 rounded border border-white/10"
                                  style={{ backgroundColor: hex }}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-[#ccc]">{palette?.label ?? c}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                <LongField label="Reference links" value={selected.refLinks} mono />
              </Section>
            )}

            {/* Timeline & budget */}
            {(selected.timeline || selected.budget || selected.source || selected.notes) && (
              <Section title="Timeline & budget">
                <div className="grid grid-cols-2 gap-4">
                  {selected.timeline && <Field label="Timeline" value={selected.timeline} />}
                  {selected.budget   && <Field label="Budget"   value={selected.budget} />}
                </div>
                {selected.source && <Field label="How they found us" value={selected.source} />}
                <LongField label="Additional notes" value={selected.notes} />
              </Section>
            )}

            {/* Reply button */}
            {(selected.email || selected.phone) && (
              <div className="pt-6 flex gap-2">
                {selected.email && (
                  <a
                    href={`mailto:${selected.email}?subject=Re: ${selected.services[0] ? (SERVICE_LABELS[selected.services[0]] ?? 'Your brief') : 'Your brief'}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C8FF47] text-[#0A0A0A] font-bold text-sm rounded-lg hover:bg-[#d4ff5c] transition-colors"
                  >
                    Reply by email ↗
                  </a>
                )}
                {selected.phone && (
                  <a
                    href={`tel:${selected.phone}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#2A2A2A] text-sm rounded-lg hover:border-[#C8FF47] hover:text-[#C8FF47] transition-colors"
                  >
                    Call ↗
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 pb-6 border-b border-[#1A1A1A] space-y-4 last:border-0">
      <h3 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#666]">{title}</h3>
      {children}
    </section>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#444] mb-2">{children}</p>
}

function Field({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      {href ? (
        <a href={href} className="text-sm text-[#C8FF47] hover:underline break-all">{value}</a>
      ) : (
        <p className="text-sm text-[#ccc]">{value}</p>
      )}
    </div>
  )
}

function LongField({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null
  return (
    <div>
      <Label>{label}</Label>
      <p className={`text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-4 ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </p>
    </div>
  )
}

function IconPdf() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.5v7m0 0L5.2 5.7M8 8.5l2.8-2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 11v1.5A1.5 1.5 0 004 14h8a1.5 1.5 0 001.5-1.5V11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
