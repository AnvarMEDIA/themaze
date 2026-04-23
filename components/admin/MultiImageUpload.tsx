'use client'

import { useCallback, useState } from 'react'
import { useDropzone }           from 'react-dropzone'
import Image                     from 'next/image'
import toast                     from 'react-hot-toast'
import { compressImage }         from '@/lib/compressImage'

interface Props {
  label: string
  values: string[]
  onChange: (urls: string[]) => void
}

export function MultiImageUpload({ label, values, onChange }: Props) {
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return
      setUploading(true)
      const results = await Promise.allSettled(
        acceptedFiles.map(async (original) => {
          const file = await compressImage(original)
          const formData = new FormData()
          formData.append('file', file)
          const res  = await fetch('/api/upload', { method: 'POST', body: formData })
          const data = await res.json() as { url?: string; error?: string }
          if (!res.ok || !data.url) throw new Error(data.error ?? `Failed: ${original.name}`)
          return data.url
        })
      )

      const uploaded = results.flatMap((r) => {
        if (r.status === 'fulfilled') return [r.value]
        toast.error(r.reason instanceof Error ? r.reason.message : 'Upload failed')
        return []
      })

      if (uploaded.length) {
        onChange([...values, ...uploaded])
        toast.success(`${uploaded.length} image${uploaded.length > 1 ? 's' : ''} uploaded!`)
      }
      setUploading(false)
    },
    [values, onChange]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.avif'] },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
  })

  const remove = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      <label className="label-sm text-maze-muted block">{label}</label>

      {/* Thumbnails grid */}
      {values.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          {values.map((url, i) => (
            <div key={i} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-maze-gray border border-maze-border">
              <Image src={url} alt={`Gallery ${i + 1}`} fill className="object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 font-bold leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors duration-200 cursor-pointer ${
          isDragActive
            ? 'border-maze-lime bg-maze-lime/5'
            : 'border-maze-border hover:border-maze-muted'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <p className="body-lg text-maze-muted animate-pulse">Uploading…</p>
        ) : isDragActive ? (
          <p className="body-lg text-maze-lime">Drop images here!</p>
        ) : (
          <div>
            <p className="body-lg text-maze-muted">Drag & drop multiple images or click to select</p>
            <p className="label-sm text-maze-muted mt-1">JPG, PNG, WEBP up to 10MB each</p>
          </div>
        )}
      </div>

      {/* Manual URL input */}
      <div className="mt-2">
        <input
          type="text"
          placeholder="Or paste image URL and press Enter"
          className="w-full bg-transparent border border-maze-border rounded-lg px-3 py-2 text-sm text-maze-cream placeholder:text-maze-muted focus:outline-none focus:border-maze-lime transition-colors"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              const val = (e.target as HTMLInputElement).value.trim()
              if (val) {
                onChange([...values, val]);
                (e.target as HTMLInputElement).value = ''
              }
            }
          }}
        />
      </div>
    </div>
  )
}
