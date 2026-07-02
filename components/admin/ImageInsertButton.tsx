'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { compressImage } from '@/lib/compressImage'

interface Props {
  /** Called with the uploaded image URL so the parent can insert it. */
  onInsert: (url: string) => void
}

/**
 * Compact uploader used inside the Markdown body editor. Reuses the
 * same compress → /api/upload pipeline as the cover <FileUpload>, but
 * instead of storing a value it hands the resulting URL back so the
 * caller can splice a `![](url)` tag into the article at the cursor.
 */
export function ImageInsertButton({ onInsert }: Props) {
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const original = acceptedFiles[0]
      if (!original) return

      setUploading(true)
      try {
        const file = await compressImage(original)
        const formData = new FormData()
        formData.append('file', file)

        const res  = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = (await res.json()) as { url?: string; error?: string }

        if (res.ok && data.url) {
          onInsert(data.url)
          const savedKb = Math.max(0, Math.round((original.size - file.size) / 1024))
          toast.success(savedKb > 50 ? `Image inserted — saved ${savedKb} KB` : 'Image inserted!')
        } else {
          toast.error(data.error ?? 'Upload failed')
        }
      } catch {
        toast.error('Upload failed')
      } finally {
        setUploading(false)
      }
    },
    [onInsert],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.avif'] },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  })

  return (
    <div
      {...getRootProps()}
      className={`flex items-center justify-center gap-2 border border-dashed rounded-lg px-3 py-2 mb-2 text-center cursor-pointer transition-colors duration-200 ${
        isDragActive ? 'border-maze-lime bg-maze-lime/5' : 'border-maze-border hover:border-maze-muted'
      }`}
    >
      <input {...getInputProps()} />
      <span className="label-sm text-maze-muted">
        {uploading
          ? 'Uploading…'
          : isDragActive
            ? 'Drop to insert'
            : '＋ Upload & insert image'}
      </span>
    </div>
  )
}
