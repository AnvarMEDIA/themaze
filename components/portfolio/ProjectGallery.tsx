'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

const EASE_OUT = [0.23, 1, 0.32, 1] as const

interface Props {
  images:  string[]
  title:   string
  heading: string  // localised "Gallery" label
}

/**
 * Portfolio gallery with a fullscreen lightbox slider.
 *
 * - Click any thumbnail to open the lightbox at that image.
 * - Navigate with the arrow buttons, the ← / → keys, the thumbnail
 *   strip, or by swiping horizontally on touch devices.
 * - Esc or a backdrop click closes it; body scroll is locked while open.
 */
export function ProjectGallery({ images, title, heading }: Props) {
  const [index, setIndex] = useState<number | null>(null)
  const open = index !== null

  const close = useCallback(() => setIndex(null), [])
  const prev  = useCallback(
    () => setIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length)),
    [images.length],
  )
  const next  = useCallback(
    () => setIndex((i) => (i === null ? i : (i + 1) % images.length)),
    [images.length],
  )

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')          close()
      else if (e.key === 'ArrowLeft')  prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, close, prev, next])

  if (images.length === 0) return null

  return (
    <div className="max-w-[1440px] mx-auto mt-20">
      <h3 className="heading-md text-maze-cream mb-8">{heading}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {images.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            data-cursor="view"
            aria-label={`Open image ${i + 1} of ${images.length}`}
            className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-maze-gray focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-lime"
          >
            <Image
              src={img}
              alt={`${title} — image ${i + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-500 ease-out [@media(hover:hover)]:group-hover:scale-[1.03]"
            />
            <span
              className="absolute inset-0 bg-maze-black/0 [@media(hover:hover)]:group-hover:bg-maze-black/20 transition-colors duration-300"
              aria-hidden="true"
            />
          </button>
        ))}
      </div>

      <AnimatePresence>
        {open && index !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="fixed inset-0 z-[9990] bg-maze-black/95 backdrop-blur-sm flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label={`${title} — gallery`}
            onClick={close}
          >
            {/* Top bar */}
            <div
              className="flex items-center justify-between px-6 md:px-10 py-5 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="label-sm text-maze-muted tabular-nums">
                {index + 1} / {images.length}
              </span>
              <button
                type="button"
                onClick={close}
                aria-label="Close gallery"
                className="w-10 h-10 rounded-full border border-maze-border text-maze-cream flex items-center justify-center hover:border-maze-lime hover:text-maze-lime transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-lime"
              >
                <span aria-hidden="true" className="text-xl leading-none">×</span>
              </button>
            </div>

            {/* Stage */}
            <div
              className="flex-1 relative flex items-center justify-center px-4 md:px-20 pb-4 min-h-0"
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                  className="relative w-full h-full cursor-grab active:cursor-grabbing"
                  drag={images.length > 1 ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.15}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -60) next()
                    else if (info.offset.x > 60) prev()
                  }}
                >
                  <Image
                    src={images[index]}
                    alt={`${title} — image ${index + 1}`}
                    fill
                    sizes="100vw"
                    priority
                    draggable={false}
                    className="object-contain select-none"
                  />
                </motion.div>
              </AnimatePresence>

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    aria-label="Previous image"
                    className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-maze-dark/80 border border-maze-border text-maze-cream flex items-center justify-center hover:border-maze-lime hover:text-maze-lime transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-lime"
                  >
                    <span aria-hidden="true">←</span>
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    aria-label="Next image"
                    className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-maze-dark/80 border border-maze-border text-maze-cream flex items-center justify-center hover:border-maze-lime hover:text-maze-lime transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-lime"
                  >
                    <span aria-hidden="true">→</span>
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div
                className="shrink-0 px-6 md:px-10 pb-6 flex gap-2 justify-start sm:justify-center overflow-x-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Go to image ${i + 1}`}
                    aria-current={i === index ? 'true' : undefined}
                    className={`relative w-16 h-12 rounded-md overflow-hidden shrink-0 transition-opacity duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-lime ${
                      i === index
                        ? 'ring-2 ring-maze-lime opacity-100'
                        : 'opacity-40 hover:opacity-80'
                    }`}
                  >
                    <Image src={img} alt="" fill sizes="64px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
