'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import type { TeamMember } from '@/lib/team'

const EMPTY_MEMBER = (): TeamMember => ({
  id:     crypto.randomUUID(),
  name:   '',
  role:   '',
  roleRu: '',
  bio:    '',
  bioRu:  '',
  photo:  '',
  order:  Date.now(),
})

export default function AdminTeamPage() {
  const [members,  setMembers]  = useState<TeamMember[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [uploading, setUploading] = useState<string | null>(null) // member id

  useEffect(() => {
    fetch('/api/team', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: TeamMember[]) => setMembers(data))
      .catch(() => toast.error('Failed to load team'))
      .finally(() => setLoading(false))
  }, [])

  const set = (id: string, key: keyof TeamMember, value: string) =>
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, [key]: value } : m))

  const addMember = () =>
    setMembers((prev) => [...prev, EMPTY_MEMBER()])

  const removeMember = (id: string) =>
    setMembers((prev) => prev.filter((m) => m.id !== id))

  const moveUp = (i: number) => {
    if (i === 0) return
    setMembers((prev) => {
      const next = [...prev]
      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
      return next.map((m, idx) => ({ ...m, order: idx + 1 }))
    })
  }

  const moveDown = (i: number) => {
    setMembers((prev) => {
      if (i >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
      return next.map((m, idx) => ({ ...m, order: idx + 1 }))
    })
  }

  const uploadPhoto = async (id: string, file: File) => {
    setUploading(id)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'team')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error()
      const { url } = await res.json()
      set(id, 'photo', url)
      toast.success('Photo uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(null)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const numbered = members.map((m, i) => ({ ...m, order: i + 1 }))
      const res = await fetch('/api/team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(numbered),
      })
      if (!res.ok) throw new Error()
      setMembers(numbered)
      toast.success('Team saved!')
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full bg-[#111] border border-[#252525] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#C8FF47] transition-colors'
  const textareaClass = inputClass + ' resize-none'

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Team</h1>
          <p className="text-sm text-[#555] mt-1">Edit team members — name, role, bio and photo.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={addMember}
            className="px-4 py-2 border border-[#252525] rounded-lg text-sm text-[#999] hover:text-white hover:border-[#444] transition-colors"
          >
            + Add member
          </button>
          <button
            onClick={save}
            disabled={saving || loading}
            className="px-6 py-2.5 bg-[#C8FF47] text-[#0A0A0A] font-bold rounded-lg text-sm hover:bg-[#F0EEE6] transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save team'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {members.map((member, i) => (
            <MemberCard
              key={member.id}
              member={member}
              index={i}
              total={members.length}
              uploading={uploading === member.id}
              inputClass={inputClass}
              textareaClass={textareaClass}
              onChange={(key, val) => set(member.id, key, val)}
              onPhotoUpload={(file) => uploadPhoto(member.id, file)}
              onMoveUp={() => moveUp(i)}
              onMoveDown={() => moveDown(i)}
              onRemove={() => removeMember(member.id)}
            />
          ))}

          {members.length === 0 && (
            <div className="text-center py-16 text-[#444] text-sm">
              No team members yet.{' '}
              <button onClick={addMember} className="text-[#C8FF47] hover:underline">Add one</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Member card ─────────────────────────────────────────────────────────── */

interface CardProps {
  member:       TeamMember
  index:        number
  total:        number
  uploading:    boolean
  inputClass:   string
  textareaClass:string
  onChange:     (key: keyof TeamMember, val: string) => void
  onPhotoUpload:(file: File) => void
  onMoveUp:     () => void
  onMoveDown:   () => void
  onRemove:     () => void
}

function MemberCard({
  member, index, total, uploading,
  inputClass, textareaClass,
  onChange, onPhotoUpload, onMoveUp, onMoveDown, onRemove,
}: CardProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const initials = member.name
    ? member.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#1E1E1E]">
        <span className="text-xs font-semibold tracking-[0.1em] uppercase text-[#444]">
          Member {index + 1}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            title="Move up"
            className="p-1.5 rounded text-[#444] hover:text-white disabled:opacity-20 transition-colors"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            title="Move down"
            className="p-1.5 rounded text-[#444] hover:text-white disabled:opacity-20 transition-colors"
          >
            ↓
          </button>
          <button
            onClick={onRemove}
            title="Remove member"
            className="p-1.5 rounded text-[#444] hover:text-red-400 transition-colors ml-1"
          >
            ×
          </button>
        </div>
      </div>

      <div className="p-5 flex gap-6">
        {/* Photo */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div
            className="w-24 h-24 rounded-xl border border-[#252525] overflow-hidden bg-[#1A1A1A] flex items-center justify-center cursor-pointer group relative"
            onClick={() => fileRef.current?.click()}
          >
            {member.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.photo}
                alt={member.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-black text-[#333]">{initials}</span>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-xs text-white font-medium">Change</span>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <span className="text-xs text-[#C8FF47]">...</span>
              </div>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-xs text-[#555] hover:text-[#C8FF47] transition-colors disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload photo'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onPhotoUpload(file)
              e.target.value = ''
            }}
          />
        </div>

        {/* Fields */}
        <div className="flex-1 grid grid-cols-1 gap-4">
          {/* Name (shared) */}
          <div>
            <label className="text-xs font-medium text-[#555] block mb-1">Name</label>
            <input
              type="text"
              placeholder="Full name"
              value={member.name}
              onChange={(e) => onChange('name', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Role EN / RU */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#555] block mb-1">Role (EN)</label>
              <input
                type="text"
                placeholder="Creative Director"
                value={member.role}
                onChange={(e) => onChange('role', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#555] block mb-1">Role (RU)</label>
              <input
                type="text"
                placeholder="Арт-директор"
                value={member.roleRu}
                onChange={(e) => onChange('roleRu', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Bio EN / RU */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#555] block mb-1">Bio (EN)</label>
              <textarea
                rows={3}
                placeholder="Short bio in English…"
                value={member.bio}
                onChange={(e) => onChange('bio', e.target.value)}
                className={textareaClass}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#555] block mb-1">Bio (RU)</label>
              <textarea
                rows={3}
                placeholder="Краткое описание на русском…"
                value={member.bioRu}
                onChange={(e) => onChange('bioRu', e.target.value)}
                className={textareaClass}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
