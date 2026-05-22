'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Image from 'next/image'
import type { Testimonial } from '@/lib/testimonials'

interface Props {
  testimonials: Testimonial[]
  locale: string
  label: string
  heading: string
}

export function TestimonialsSection({ testimonials, locale, label, heading }: Props) {
  const ref    = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })

  if (testimonials.length === 0) return null
  const isRu = locale === 'ru'

  return (
    <section
      ref={ref}
      className="px-6 md:px-10 py-20 md:py-28 border-t border-maze-border"
    >
      <div className="max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="mb-12 max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="label-sm text-maze-muted mb-3"
          >
            {label}
          </motion.p>
          <div className="overflow-hidden">
            <motion.h2
              initial={{ y: '100%' }}
              animate={inView ? { y: '0%' } : {}}
              transition={{ duration: 0.85, ease: [0.23, 1, 0.32, 1] }}
              className="display-md text-maze-cream pb-[0.18em]"
            >
              {heading}
            </motion.h2>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t, i) => {
            const role   = isRu && t.roleRu  ? t.roleRu  : t.role
            const quote  = isRu && t.quoteRu ? t.quoteRu : t.quote
            const rating = Math.min(5, Math.max(1, t.rating ?? 5))
            const initials = t.author
              ? t.author.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
              : '?'
            return (
              <motion.figure
                key={t.id}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.08 + i * 0.06, duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
                className={`p-7 border rounded-2xl bg-maze-dark/30 flex flex-col gap-5 transition-colors duration-200 ${
                  t.featured
                    ? 'border-maze-lime/50 hover:border-maze-lime'
                    : 'border-maze-border hover:border-maze-cream/40'
                }`}
              >
                <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, s) => (
                    <span
                      key={s}
                      className={s < rating ? 'text-maze-lime' : 'text-maze-border'}
                      aria-hidden="true"
                    >
                      ★
                    </span>
                  ))}
                </div>
                <blockquote className="body-lg text-maze-cream leading-relaxed flex-1 before:content-['\201C'] before:text-maze-lime before:mr-1 before:text-2xl after:content-['\201D'] after:text-maze-lime after:ml-1 after:text-2xl">
                  {quote}
                </blockquote>
                <figcaption className="flex items-center gap-3 pt-4 border-t border-maze-border">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-maze-gray flex items-center justify-center shrink-0">
                    {t.avatar ? (
                      <Image
                        src={t.avatar}
                        alt={t.author}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-maze-muted font-bold text-sm" aria-hidden="true">{initials}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-maze-cream text-sm">{t.author}</p>
                    {role && <p className="label-sm text-maze-muted mt-0.5">{role}</p>}
                  </div>
                </figcaption>
              </motion.figure>
            )
          })}
        </div>
      </div>
    </section>
  )
}
