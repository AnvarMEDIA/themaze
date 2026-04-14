'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'

const stats = [
  { value: 200, suffix: '+', label: 'Projects completed' },
  { value: 7,   suffix: '+', label: 'Years of experience' },
  { value: 80,  suffix: '+', label: 'Happy clients' },
  { value: 12,  suffix: '',  label: 'Awards won' },
]

export function AboutSection() {
  const ref    = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [-30, 30])

  return (
    <section
      ref={ref}
      className="px-6 md:px-10 py-24 md:py-36 border-t border-maze-border"
    >
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        {/* Left */}
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="label-sm text-maze-muted mb-6"
          >
            About MAZE
          </motion.p>

          <div className="overflow-hidden mb-8">
            <motion.h2
              initial={{ y: '100%' }}
              animate={inView ? { y: '0%' } : {}}
              transition={{ duration: 0.9, ease: [0.19, 1, 0.22, 1] }}
              className="display-md text-maze-cream"
            >
              We navigate complexity.
            </motion.h2>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="body-lg text-maze-muted max-w-lg mb-8"
          >
            MAZE is a branding and design studio based in Tashkent. Like a well-designed
            maze, we guide brands through complexity to clarity — crafting identities that
            navigate markets, define culture, and lead audiences forward.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.45, duration: 0.7 }}
            className="body-lg text-maze-muted max-w-lg mb-10"
          >
            From Uzbekistan's top startups to global brands entering Central Asia,
            we build visual languages that resonate, endure, and grow.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.6 }}
          >
            <Link
              href="/about"
              className="inline-flex items-center gap-3 label-sm text-maze-lime border border-maze-lime px-6 py-3 rounded-full hover:bg-maze-lime hover:text-maze-black transition-all duration-300"
            >
              Our story →
            </Link>
          </motion.div>
        </div>

        {/* Right — Stats + visual */}
        <motion.div style={{ y }} className="space-y-6">
          {/* Maze graphic */}
          <div className="rounded-xl border border-maze-border bg-maze-dark p-8 relative overflow-hidden">
            <div className="absolute inset-0 maze-grid opacity-40" />
            <div className="relative z-10 grid grid-cols-2 gap-6">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
                  className="p-4 rounded-lg bg-maze-gray/50 border border-maze-border"
                >
                  <div className="heading-lg text-maze-lime font-black">
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="label-sm text-maze-muted mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Quote */}
          <motion.blockquote
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.7 }}
            className="border-l-2 border-maze-lime pl-5 body-lg text-maze-muted italic"
          >
            "Design is not just what it looks like. Design is how it works —
            and how it makes people feel."
          </motion.blockquote>
        </motion.div>
      </div>
    </section>
  )
}
