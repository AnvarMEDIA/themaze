'use client'

/**
 * LiquidButton — Apple-style liquid glass morphism button.
 *
 * Material architecture (3 layers):
 *  1. Backdrop   — CSS backdrop-filter (blur + saturate) on the wrapper
 *  2. Surface    — semi-transparent tinted fill (glass-lime / glass-clear CSS classes)
 *  3. Specular   — rendered as absolutely-positioned spans inside the button:
 *       a) Catch-light: diagonal gradient simulating glass catching room light
 *       b) Rim light:  1px bright strip along the top edge
 *
 * Motion (Emil's rules):
 *  - Only transform + opacity via Framer Motion
 *  - Material properties (background, shadow) via CSS transitions
 *  - Spring physics for hover lift + tap press
 *  - prefers-reduced-motion: skip spatial animation, keep opacity
 */

import { useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

export type GlassVariant = 'lime' | 'clear'
export type GlassSize    = 'sm' | 'md' | 'lg'

interface BaseProps {
  variant?:   GlassVariant
  size?:      GlassSize
  className?: string
  children:   React.ReactNode
}

interface AsLink extends BaseProps {
  href:       string
  external?:  boolean
  type?:      never
  disabled?:  never
  onClick?:   never
}

interface AsButton extends BaseProps {
  href?:      never
  external?:  never
  type?:      'button' | 'submit'
  disabled?:  boolean
  onClick?:   () => void
}

type Props = AsLink | AsButton

const SIZE = {
  sm: { pad: 'px-5 py-2.5',   text: 'text-[10px] gap-2',   arrow: 14 },
  md: { pad: 'px-6 py-3.5',   text: 'text-[11px] gap-2.5', arrow: 14 },
  lg: { pad: 'px-8 py-[1.1rem]', text: 'text-[12px] gap-3', arrow: 15 },
}

export function LiquidButton({
  variant  = 'lime',
  size     = 'md',
  className,
  children,
  ...rest
}: Props) {
  const shouldReduce = useReducedMotion()
  const { pad, text, arrow } = SIZE[size]

  /* Spring config — Apple-like: snappy response, subtle bounce */
  const spring = {
    type:      'spring' as const,
    stiffness: 420,
    damping:   30,
    mass:      0.75,
  }

  /* ── Inner content (text + decorative layers) ── */
  const Inner = (
    <>
      {/*
        Specular catch-light: simulates glass surface reflecting a light source.
        Positioned at upper-left → fades diagonally. Never animates (physical prop).
      */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        style={{
          background: variant === 'lime'
            ? 'linear-gradient(148deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.08) 20%, transparent 52%)'
            : 'linear-gradient(148deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.05) 25%, transparent 55%)',
        }}
      />
      {/*
        Rim light: 1px bright strip along top edge, tapered at corners.
        Gives the "lifted glass edge" look from visionOS.
      */}
      <span
        aria-hidden
        className="absolute inset-x-[12%] top-0 h-px pointer-events-none rounded-t-full"
        style={{
          background: variant === 'lime'
            ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.65) 30%, rgba(255,255,255,0.65) 70%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 30%, rgba(255,255,255,0.45) 70%, transparent 100%)',
        }}
      />
      {/* Content */}
      <span
        className={cn(
          'relative z-10 flex items-center font-semibold tracking-[0.115em] uppercase',
          text
        )}
      >
        {children}
      </span>
    </>
  )

  /* ── Shared classes for the interactive element ── */
  const baseClass = cn(
    'relative overflow-hidden rounded-full',
    variant === 'lime' ? 'glass-lime' : 'glass-clear',
    pad,
    /* Focus ring via outline — accessible, doesn't clip (outline is outside) */
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3',
    variant === 'lime'
      ? 'focus-visible:outline-[rgba(200,255,71,0.6)]'
      : 'focus-visible:outline-[rgba(255,255,255,0.4)]',
    className
  )

  /* ── Render ── */
  if ('href' in rest && rest.href) {
    const { href, external } = rest as AsLink
    const linkProps = external
      ? { target: '_blank' as const, rel: 'noopener noreferrer' }
      : {}

    return (
      <motion.div
        whileHover={shouldReduce ? undefined : { scale: 1.035, y: -2 }}
        whileTap={shouldReduce  ? undefined : { scale: 0.960, y:  0 }}
        transition={spring}
        style={{ display: 'inline-block' }}
      >
        <Link href={href} className={baseClass} {...linkProps}>
          {Inner}
        </Link>
      </motion.div>
    )
  }

  const { type = 'button', disabled, onClick } = rest as AsButton

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileHover={!disabled && !shouldReduce ? { scale: 1.035, y: -2 } : undefined}
      whileTap={!disabled  && !shouldReduce ? { scale: 0.960, y:  0 } : undefined}
      transition={spring}
      className={cn(baseClass, 'disabled:opacity-50 disabled:pointer-events-none')}
    >
      {Inner}
    </motion.button>
  )
}
