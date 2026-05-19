'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import type { PressKitData } from '@/lib/pressKit'

interface Props {
  kit: PressKitData
}

export function PressKitInteractive({ kit }: Props) {
  const [pinging, setPinging] = useState(false)

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} — copied`)
    } catch {
      toast.error('Clipboard blocked — select the text and ⌘C / Ctrl+C')
    }
  }

  const pingIndex = async () => {
    setPinging(true)
    try {
      const res = await fetch('/api/admin/notify-indexing', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ urls: [kit.publicUrl, `${new URL(kit.publicUrl).origin}/ru${new URL(kit.publicUrl).pathname}`] }),
      })
      const data = await res.json() as { ok: boolean; submitted: number; status?: number }
      if (data.ok) {
        toast.success(`IndexNow notified · ${data.submitted} URLs`)
      } else {
        toast.error(`IndexNow returned ${data.status ?? 'error'}`)
      }
    } catch {
      toast.error('Network error')
    } finally {
      setPinging(false)
    }
  }

  return (
    <div className="space-y-10">
      {/* Quick actions row */}
      <section className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={pingIndex}
          disabled={pinging}
          className="px-4 py-2 bg-[#C8FF47] text-[#0A0A0A] font-bold rounded-lg text-sm hover:bg-[#F0EEE6] transition-colors disabled:opacity-60"
        >
          {pinging ? 'Pinging…' : '↻ Ping search engines now'}
        </button>
        <button
          type="button"
          onClick={() => copy('Public URL', kit.publicUrl)}
          className="px-4 py-2 border border-[#252525] rounded-lg text-sm text-[#999] hover:text-white hover:border-[#444] transition-colors"
        >
          Copy URL
        </button>
        <code className="text-xs font-mono text-[#888] bg-[#0D0D0D] border border-[#1E1E1E] rounded px-3 py-2 truncate max-w-md">
          {kit.publicUrl}
        </code>
      </section>

      {/* Image assets */}
      {(kit.project.coverImage || kit.project.images.length > 0) && (
        <section>
          <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-[#555] mb-4">
            Image assets — right-click to save, or drag into a tab
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[kit.project.coverImage, ...kit.project.images].filter(Boolean).map((url, i) => (
              <a
                key={url + i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="relative block aspect-[4/3] rounded-lg overflow-hidden bg-[#1A1A1A] border border-[#252525] hover:border-[#C8FF47] transition-colors group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-1 right-1 text-[10px] font-mono bg-black/70 text-white px-1.5 py-0.5 rounded">
                  {i === 0 ? 'cover' : `#${i}`}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Direct submit links */}
      <section>
        <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-[#555] mb-4">
          Submit the case to design directories
        </h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {kit.submitLinks.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] hover:border-[#C8FF47] transition-colors group"
              >
                <p className="text-sm font-semibold text-white group-hover:text-[#C8FF47] transition-colors flex items-center gap-2">
                  {l.label}
                  <span className="text-[10px] opacity-60">↗</span>
                </p>
                {l.note && <p className="text-xs text-[#555] mt-1">{l.note}</p>}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* One-click share */}
      <section>
        <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-[#555] mb-4">
          One-click share
        </h2>
        <div className="flex flex-wrap gap-2">
          {kit.shareLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-full border border-[#252525] text-sm text-[#aaa] hover:text-[#C8FF47] hover:border-[#C8FF47] transition-colors"
            >
              {l.label} ↗
            </a>
          ))}
        </div>
      </section>

      {/* Pre-rendered snippets */}
      <section>
        <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-[#555] mb-4">
          Ready-to-paste copy
        </h2>
        <div className="space-y-4">
          {kit.snippets.map((s) => (
            <div key={s.label} className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#1E1E1E]">
                <div>
                  <p className="text-sm font-semibold text-white">{s.label}</p>
                  {s.hint && <p className="text-[11px] text-[#555] mt-0.5">{s.hint}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => copy(s.label, s.text)}
                  className="px-3 py-1.5 text-xs bg-[#1A1A1A] hover:bg-[#252525] border border-[#252525] rounded-lg text-[#aaa] hover:text-white transition-colors"
                >
                  Copy
                </button>
              </div>
              <pre className="px-5 py-4 text-sm text-[#ccc] whitespace-pre-wrap font-mono leading-relaxed max-h-72 overflow-y-auto">
{s.text}
              </pre>
            </div>
          ))}
        </div>
      </section>

      {/* Hashtag block */}
      <section className="pb-12">
        <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-[#555] mb-4">
          Hashtags
        </h2>
        <div className="flex flex-wrap gap-2">
          {kit.hashtags.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => copy('hashtag', h)}
              className="px-3 py-1.5 text-xs font-mono bg-[#0D0D0D] border border-[#1E1E1E] hover:border-[#C8FF47] hover:text-[#C8FF47] rounded-full text-[#888] transition-colors"
            >
              {h}
            </button>
          ))}
          <button
            type="button"
            onClick={() => copy('hashtag set', kit.hashtags.join(' '))}
            className="px-3 py-1.5 text-xs bg-[#1A1A1A] border border-[#252525] rounded-full text-[#aaa] hover:text-white transition-colors"
          >
            Copy all
          </button>
        </div>
      </section>
    </div>
  )
}
