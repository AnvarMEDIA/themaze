'use client'

import { useCallback, useState } from 'react'
import { useDropzone }           from 'react-dropzone'
import Image                     from 'next/image'
import toast                     from 'react-hot-toast'

interface Props {
  label: string
  value: string
  onChange: (url: string) => void
}

export function FileUpload({ label, value, onChange }: Props) {
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)

        const res  = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json() as { url?: string; error?: string }

        if (res.ok && data.url) {
          onChange(data.url)
          toast.success('Image uploaded!')
        } else {
          toast.error(data.error ?? 'Upload failed')
        }
      } catch {
        toast.error('Upload failed')
      }
      setUploading(false)
    },
    [onChange]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.avif'] },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  })

  return (
    <div className="space-y-2">
      <label className="label-sm text-maze-muted block">{label}</label>

      {/* Preview */}
      {value && (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-maze-gray border border-maze-border mb-3">
          <Image src={value} alt="Preview" fill className="object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Remove image"
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors duration-200 ${
          isDragActive
            ? 'border-maze-lime bg-maze-lime/5'
            : 'border-maze-border hover:border-maze-muted'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <p className="body-lg text-maze-muted animate-pulse">Uploading…</p>
        ) : isDragActive ? (
          <p className="body-lg text-maze-lime">Drop it here!</p>
        ) : (
          <div>
            <p className="body-lg text-maze-muted">
              {value ? 'Replace image' : 'Drag & drop or click to upload'}
            </p>
            <p className="label-sm text-maze-muted mt-1">JPG, PNG, WEBP up to 10MB</p>
          </div>
        )}
      </div>

      {/* Manual URL input */}
      <div className="mt-2">
        <input
          type="text"
          placeholder="Or paste image URL"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent border border-maze-border rounded-lg px-3 py-2 text-sm text-maze-cream placeholder:text-maze-muted focus:outline-none focus:border-maze-lime transition-colors"
        />
      </div>
    </div>
  )
}
