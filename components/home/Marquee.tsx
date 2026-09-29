'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import { motion, useScroll, useTransform } from 'framer-motion'

interface MarqueeRowProps {
  items: string[]
  reverse?: boolean
  speed?: number
}

function MarqueeRow({ items, reverse = false, speed = 30 }: MarqueeRowProps) {
  const doubled = [...items, ...items]
  return (
    <div className="overflow-hidden select-none">
      <div
        className={reverse ? 'marquee-track-reverse' : 'marquee-track'}
        style={{ animationDuration: `${speed}s` }}
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-6 pr-6 whitespace-nowrap"
          >
            <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-maze-muted uppercase tracking-tight">
              {item}
            </span>
            <span className="w-2 h-2 rounded-full bg-maze-lime shrink-0" />
          </span>
        ))}
      </div>
    </div>
  )
}

export function Marquee() {
  const t     = useTranslations('marquee')
  const items = t.raw('items') as string[]
  const ref   = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])
  const y       = useTransform(scrollYProgress, [0, 1], [40, -40])

  return (
    <motion.div
      ref={ref}
      style={{ opacity, y }}
      className="py-8 border-y border-maze-border space-y-4 overflow-hidden"
    >
      <MarqueeRow items={items} />
      <MarqueeRow items={items} reverse speed={22} />
    </motion.div>
  )
}
