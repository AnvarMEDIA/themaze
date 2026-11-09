'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from '@/i18n/navigation'

// 'light' is for coloured surfaces (the gradient button): see the dot's
// blend mode below.
type Variant = 'default' | 'hover' | 'view' | 'light'

/**
 * Performance-optimised cursor.
 * - Position: pure RAF + direct DOM transform (zero React re-renders)
 * - Size: CSS transform: scale() — GPU-accelerated (Emil's rule: only transform + opacity)
 * - Hover detection: single delegated listener on document
 *
 * Disabled on the portfolio pages: when browsing work the visitor is
 * looking at imagery, so the native cursor is less distracting and
 * makes the gallery lightbox feel like a normal image viewer. While
 * disabled the component adds `native-cursor` to <html> so globals.css
 * restores the system cursor.
 */
export function CustomCursor() {
  const dotRef   = useRef<HTMLDivElement>(null)
  const ringRef  = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const [variant, setVariant] = useState<Variant>('default')

  // Portfolio list (/portfolio) and any project page (/portfolio/<slug>).
  const useNativeCursor = pathname === '/portfolio' || pathname.startsWith('/portfolio/')

  useEffect(() => {
    const html = document.documentElement
    html.classList.toggle('native-cursor', useNativeCursor)
    return () => html.classList.remove('native-cursor')
  }, [useNativeCursor])

  // ── Position tracking (RAF, no React) ──────────────────────────────────
  useEffect(() => {
    let mx = -200, my = -200
    let dx = -200, dy = -200
    let rx = -200, ry = -200
    let raf: number
    let hidden = true

    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY
      if (hidden) { dx = mx; dy = my; rx = mx; ry = my; hidden = false }
    }

    const loop = () => {
      dx = mx; dy = my
      rx += (mx - rx) * 0.1
      ry += (my - ry) * 0.1

      const dot  = dotRef.current
      const ring = ringRef.current
      if (dot)  dot.style.transform  = `translate(${dx}px,${dy}px) translate(-50%,-50%) scale(var(--cursor-scale,1))`
      if (ring) ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`

      raf = requestAnimationFrame(loop)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    raf = requestAnimationFrame(loop)
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf) }
  }, [])

  // ── Hover detection (event delegation) ─────────────────────────────────
  useEffect(() => {
    const SELECTOR = 'a, button, [data-cursor]'

    const onOver = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest(SELECTOR) as HTMLElement | null
      if (!el) return
      setVariant((el.dataset.cursor as Variant) ?? 'hover')
    }

    const onOut = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(SELECTOR)) return
      const entering = e.relatedTarget as HTMLElement | null
      if (!entering?.closest(SELECTOR)) setVariant('default')
    }

    document.addEventListener('mouseover', onOver, { passive: true })
    document.addEventListener('mouseout',  onOut,  { passive: true })
    return () => {
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout',  onOut)
    }
  }, [])

  // ── Scale: use transform only — GPU-accelerated (Emil's rule) ──────────
  // Base dot size: 10px. Scale multipliers: default=1, hover/light=3.6, view=7.2
  const grown = variant === 'hover' || variant === 'light'
  const scale =
    variant === 'view' ? 7.2 :
    grown              ? 3.6 : 1

  // Hover inverts what is under the dot, which is crisp on black and white
  // and a mess on colour: orange turns teal and the label goes with it. On
  // a coloured surface (data-cursor="light") the same disc lays light over
  // the colour instead, and dark text under it stays dark.
  const blendMode =
    variant === 'hover' ? 'difference' :
    variant === 'light' ? 'soft-light' : 'normal'

  // On portfolio pages we show the native cursor instead.
  if (useNativeCursor) return null

  return (
    <>
      {/* Dot — 10px base, scales via CSS transform */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] rounded-full will-change-transform"
        style={{
          width:           10,
          height:          10,
          // Resting and "View": the accent (white on dark, black on light).
          // Grown (hover, light): always white. Difference blending inverts
          // whatever is underneath on either theme, and black would blend
          // to nothing; soft-light needs white to lay light at all.
          backgroundColor: grown ? '#FFFFFF' : 'rgb(var(--lime))',
          mixBlendMode:    blendMode as React.CSSProperties['mixBlendMode'],
          /* Only transform + opacity transitions — Emil's rule */
          transition: `transform 160ms cubic-bezier(0.23,1,0.32,1), opacity 160ms ease`,
          '--cursor-scale': scale,
        } as React.CSSProperties}
      >
        {/* "View" label — opacity fade only (no layout change) */}
        <span
          className="absolute inset-0 flex items-center justify-center text-maze-ink font-bold tracking-[0.15em] uppercase select-none"
          style={{
            fontSize: 9 / scale,  // compensate for scale so text reads at ~9px
            opacity:  variant === 'view' ? 1 : 0,
            transition: 'opacity 100ms ease',
          }}
        >
          View
        </span>
      </div>

      {/* Ring — trails behind, fades on hover */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none z-[9998] rounded-full border border-[#444] will-change-transform"
        style={{
          width:   36,
          height:  36,
          opacity: variant === 'default' ? 1 : 0,
          transition: 'opacity 160ms ease',
        }}
      />
    </>
  )
}
