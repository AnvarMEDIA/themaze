'use client'

/**
 * InfiniteGrid — perspective 3D grid scrolling toward the viewer.
 *
 * Technique:
 *  1. CSS `perspective` on the container creates a vanishing-point illusion.
 *  2. The grid div is rotated on the X-axis (rotateX) so it lies flat in 3D space,
 *     making the top of the element appear as the "horizon" and the bottom as "close".
 *  3. Framer Motion animates `backgroundPositionY` by exactly one cell size each loop,
 *     creating a seamless infinite-scroll effect.
 *  4. Three gradient overlays dissolve the grid at the top (horizon), sides, and
 *     bottom (under the hero text) — giving it a sense of emerging from darkness.
 *
 * Performance:
 *  - Only `transform` and `background-position` animated (GPU composited path).
 *  - `will-change: transform` on the grid plane.
 *  - Stops animation entirely with `prefers-reduced-motion`.
 */

import { motion, useReducedMotion } from 'framer-motion'

const CELL   = 72   // grid cell size in px — also the animation distance per cycle
const SPEED  = 3.2  // seconds per cell — controls scroll speed

export function InfiniteGrid() {
  const shouldReduce = useReducedMotion()

  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
    >
      {/* ── Perspective container ───────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          perspective:       '420px',
          perspectiveOrigin: '50% 50%',
        }}
      >
        {/*
          Grid plane:
          - Positioned so it extends well beyond the viewport edges (200% width)
          - RotateX(68deg) lays the plane flat in 3D space
          - The background-image stacks:
              [0] dot  — radial-gradient circle at each intersection
              [1] horiz line
              [2] vert  line
          - backgroundPositionY animated 0 → CELL creates seamless loop
        */}
        <motion.div
          className="absolute"
          style={{
            width:           '200%',
            height:          '240%',
            left:            '-50%',
            top:             '-80%',
            transformOrigin: '50% 100%',
            transform:       'rotateX(68deg)',
            willChange:      'transform',
            backgroundImage: [
              /* glowing dot at each intersection */
              `radial-gradient(circle, rgba(200,255,71,0.55) 1px, transparent 1px)`,
              /* horizontal grid lines */
              `linear-gradient(rgba(200,255,71,0.10) 1px, transparent 1px)`,
              /* vertical grid lines */
              `linear-gradient(90deg, rgba(200,255,71,0.10) 1px, transparent 1px)`,
            ].join(', '),
            backgroundSize:     `${CELL}px ${CELL}px, ${CELL}px ${CELL}px, ${CELL}px ${CELL}px`,
            backgroundPosition: '0 0',
          }}
          /* Animate one full cell downward → seamless loop */
          animate={shouldReduce ? undefined : {
            backgroundPositionY: [`0px`, `${CELL}px`],
          }}
          transition={{
            duration:   SPEED,
            ease:       'linear',
            repeat:     Infinity,
            repeatType: 'loop',
          }}
        />
      </div>

      {/* ── Gradient dissolves ─────────────────────────────────────── */}

      {/* Top — horizon fades into darkness (strongest, covers ~55% height) */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height:     '60%',
          background: 'linear-gradient(to bottom, rgb(var(--bg)) 0%, rgb(var(--bg)) 10%, rgba(var(--bg),0.85) 40%, transparent 100%)',
        }}
      />

      {/* Bottom — fades under hero content */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height:     '45%',
          background: 'linear-gradient(to top, rgb(var(--bg)) 0%, rgb(var(--bg)) 5%, rgba(var(--bg),0.70) 35%, transparent 100%)',
        }}
      />

      {/* Left edge */}
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width:      '18%',
          background: 'linear-gradient(to right, rgb(var(--bg)), transparent)',
        }}
      />

      {/* Right edge */}
      <div
        className="absolute inset-y-0 right-0"
        style={{
          width:      '18%',
          background: 'linear-gradient(to left, rgb(var(--bg)), transparent)',
        }}
      />

      {/*
        Central depth fog:
        Radial vignette from the vanishing-point area (center-top of visible grid).
        Gives the "emerging from void" look — the grid brightens as it approaches.
      */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 55% at 50% 42%, transparent 10%, rgba(var(--bg),0.55) 55%, rgba(var(--bg),0.90) 100%)',
        }}
      />

      {/* Lime glow — soft backlight at the vanishing point */}
      <div
        className="absolute"
        style={{
          top:       '28%',
          left:      '50%',
          transform: 'translateX(-50%)',
          width:     '480px',
          height:    '240px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(200,255,71,0.07) 0%, transparent 70%)',
          filter:    'blur(40px)',
        }}
      />
    </div>
  )
}
