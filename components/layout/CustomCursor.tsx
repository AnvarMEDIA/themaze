'use client'

import { useEffect, useRef, useState } from 'react'

type Variant = 'default' | 'hover' | 'view'

/**
 * Performance-optimised cursor.
 * Position tracking: pure RAF + direct DOM style (zero React re-renders).
 * Variant tracking: React state (fires only on hover enter/leave — rare).
 * Hover detection: single delegated listener on document (no per-element attachment).
 */
export function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  // React state only for shape/size variant — changes rarely
  const [variant, setVariant] = useState<Variant>('default')

  // ── Position tracking (RAF, no React) ──────────────────────────────────
  useEffect(() => {
    let mx = -200, my = -200 // raw mouse target
    let dx = -200, dy = -200 // dot current (near-instant follow)
    let rx = -200, ry = -200 // ring current (laggy follow)
    let raf: number
    let hidden = true

    const onMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
      if (hidden) {
        // Snap on first move so cursor doesn't slide in from corner
        dx = mx; dy = my
        rx = mx; ry = my
        hidden = false
      }
    }

    const loop = () => {
      // Dot: direct snap (lerp factor ~1 = instant, no perceived lag)
      dx = mx
      dy = my

      // Ring: smooth lerp trail
      rx += (mx - rx) * 0.1
      ry += (my - ry) * 0.1

      const dot  = dotRef.current
      const ring = ringRef.current

      if (dot) {
        dot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`
      }
      if (ring) {
        ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`
      }

      raf = requestAnimationFrame(loop)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    raf = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  // ── Hover detection (event delegation — no per-element listeners) ───────
  useEffect(() => {
    const SELECTOR = 'a, button, [data-cursor]'

    const onOver = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest(SELECTOR) as HTMLElement | null
      if (!el) return
      const type = el.dataset.cursor as Variant | undefined
      setVariant(type ?? 'hover')
    }

    const onOut = (e: MouseEvent) => {
      const leaving = e.target as HTMLElement
      if (!leaving.closest(SELECTOR)) return
      // Only reset if we're not moving to another interactive child
      const entering = e.relatedTarget as HTMLElement | null
      if (!entering?.closest(SELECTOR)) {
        setVariant('default')
      }
    }

    document.addEventListener('mouseover', onOver, { passive: true })
    document.addEventListener('mouseout',  onOut,  { passive: true })

    return () => {
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout',  onOut)
    }
  }, [])

  // ── Derived styles (pure CSS transitions, no JS animation) ─────────────
  const dotSize =
    variant === 'view'  ? 72 :
    variant === 'hover' ? 36 : 10

  const showRing = variant === 'default'

  return (
    <>
      {/* Dot — snaps to cursor, size transitions via CSS */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] rounded-full will-change-transform"
        style={{
          width:           dotSize,
          height:          dotSize,
          backgroundColor: '#C8FF47',
          mixBlendMode:    variant === 'hover' ? 'difference' : 'normal',
          transition:      'width 180ms ease, height 180ms ease, background-color 180ms ease',
        }}
      >
        {variant === 'view' && (
          <span className="absolute inset-0 flex items-center justify-center text-[#080808] text-[9px] font-bold tracking-[0.15em] uppercase select-none">
            View
          </span>
        )}
      </div>

      {/* Ring — trails behind, fades on hover */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none z-[9998] rounded-full border border-[#444] will-change-transform"
        style={{
          width:      36,
          height:     36,
          opacity:    showRing ? 1 : 0,
          transition: 'opacity 180ms ease',
        }}
      />
    </>
  )
}
