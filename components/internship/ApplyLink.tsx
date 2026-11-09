'use client'

import { useReducedMotion } from 'framer-motion'
import { Arrow } from '@/components/ui/Arrow'

/**
 * "Apply" in the hero: glides down to the form and puts the cursor in its
 * first field, so the next keystroke is the name. A plain #apply link without
 * JavaScript, and an instant jump for reduced motion.
 */
export function ApplyLink({ label }: { label: string }) {
  const reduce = useReducedMotion()

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById('apply')
    if (!target) return
    e.preventDefault()
    const top = target.getBoundingClientRect().top + window.scrollY - 24
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
    history.replaceState(null, '', '#apply')
    document.getElementById('if-name')?.focus({ preventScroll: true })
  }

  return (
    <a
      href="#apply"
      onClick={onClick}
      className="group inline-flex items-center gap-3 px-8 py-4 bg-maze-lime text-maze-ink font-bold rounded-full transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-maze-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-cream focus-visible:ring-offset-2 focus-visible:ring-offset-maze-black"
    >
      {label}
      <Arrow
        direction="down"
        className="text-base transition-transform duration-200 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-y-0.5"
      />
    </a>
  )
}
