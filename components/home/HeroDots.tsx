'use client'

import { useEffect, useRef } from 'react'

/**
 * The dot grid behind the homepage's first screen, alive: the same dots as
 * the map's, in the same language.
 *
 * - Under a mouse, the dots swell, darken (light up, on the dark theme) and
 *   lean away from the pointer, as under a lens. The lens trails the pointer
 *   a little, eased every frame, so it moves like something with weight and
 *   not like a sticker glued to the cursor.
 * - A click or a tap sends a ring out through the dots from that point. On
 *   a phone, where nothing hovers, that is the whole interaction.
 * - Once a visit, a first ring from the middle as the headline settles, so
 *   that the grid is seen to be alive before anyone touches it.
 *
 * At rest it is exactly the grid that was there before, drawn on a canvas.
 * The CSS grid stays for a page without scripts and for reduced motion
 * (see .hero-dots in globals.css), and until the canvas has drawn. The
 * canvas only draws while something is moving, then stops.
 */

const STEP      = 36           // between dots, px: the CSS grid's background-size
const DOT       = 1            // a dot at rest: radius, px
const REST      = 0.38 * 0.28  // and alpha: the CSS grid's colour alpha × its layer's opacity
const PEAK      = 0.5          // alpha at the heart of the lens
const GROW      = 1.7          // extra radius there, px
const LENS      = 70           // the lens's spread (one σ), px
const PUSH      = 9            // the most a dot leans away from the pointer, px
const RING_MS   = 1600         // a ring's life
const RING_W    = 26           // the width of its band (one σ), px
const RING_GAIN = 1.3          // how strongly it swells the dots it passes, against the lens
const RING_PUSH = 6            // how far it pushes dots outward as it passes, px
const MAX_PX    = 8e6          // the canvas's pixel budget
const INTRO_KEY = 'maze-hero-ripple'
const TAU       = Math.PI * 2

const MASK = 'radial-gradient(ellipse 72% 60% at 50% 48%, black 0%, transparent 100%)'

interface Ring { x: number; y: number; t0: number; amp: number; reach: number }

export function HeroDots() {
  const boxRef    = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const box     = boxRef.current
    const canvas  = canvasRef.current
    const section = box?.closest('section')
    const ctx     = canvas?.getContext('2d')
    if (!box || !canvas || !section || !ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

    let live = false
    let w = 0, h = 0, dpr = 1
    let ink = '10,10,10'
    let frame = 0, last = 0
    // The mouse, in the window's terms, while it is over the first screen.
    let mouseX = 0, mouseY = 0, mouseOver = false
    // The lens, in the canvas's terms, and how present it is (0 to 1).
    let lensX = 0, lensY = 0, lens = 0
    let rings: Ring[] = []
    let press: { x: number; y: number; t: number; id: number } | null = null
    let intro = 0

    // The theme's dot colour, as "r,g,b".
    const readInk = () => {
      const rgb = getComputedStyle(document.documentElement).getPropertyValue('--dot').trim().split(/[\s,]+/)
      ink = rgb.length >= 3 ? rgb.slice(0, 3).join(',') : '10,10,10'
    }

    const size = () => {
      w   = box.clientWidth
      h   = box.clientHeight
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      if (w * h * dpr * dpr > MAX_PX) dpr = Math.max(1, Math.sqrt(MAX_PX / (w * h)))
      canvas.width  = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
    }

    const draw = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const lensOn = lens > 0.001
      const s2     = 2 * LENS * LENS
      const far2   = (3.5 * LENS) ** 2

      // Each ring where it is now: it leaves fast and slows as it spreads
      // (ease-out), fading as it goes.
      const waves = rings.map((r) => {
        const t = Math.max(0, Math.min(1, (now - r.t0) / RING_MS))
        return { x: r.x, y: r.y, radius: (1 - (1 - t) ** 3) * r.reach, amp: r.amp * (1 - t) ** 1.5 }
      }).filter((r) => r.amp > 0.002)

      // The dots at rest go into one path and are filled at once; the
      // others are kept as x, y, strength and drawn one by one.
      const moved: number[] = []
      ctx.beginPath()
      for (let y0 = STEP / 2; y0 < h + STEP / 2; y0 += STEP) {
        for (let x0 = STEP / 2; x0 < w + STEP / 2; x0 += STEP) {
          let g = 0, dx = 0, dy = 0

          if (lensOn) {
            const ex = x0 - lensX, ey = y0 - lensY
            const d2 = ex * ex + ey * ey
            if (d2 < far2) {
              g += lens * Math.exp(-d2 / s2)
              const d = Math.sqrt(d2)
              if (d > 0.5) {
                // Nothing right under the pointer, most at one σ, gone by three.
                const p = PUSH * lens * (d / LENS) * Math.exp(0.5 - d2 / s2)
                dx += (ex / d) * p
                dy += (ey / d) * p
              }
            }
          }

          for (const r of waves) {
            const ex = x0 - r.x, ey = y0 - r.y
            const d   = Math.sqrt(ex * ex + ey * ey)
            const off = d - r.radius
            if (off > -3.5 * RING_W && off < 3.5 * RING_W) {
              const q = r.amp * Math.exp(-(off * off) / (2 * RING_W * RING_W))
              g += q * RING_GAIN
              if (d > 0.5) {
                dx += (ex / d) * RING_PUSH * q
                dy += (ey / d) * RING_PUSH * q
              }
            }
          }

          if (g < 0.004 && Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
            ctx.moveTo(x0 + DOT, y0)
            ctx.arc(x0, y0, DOT, 0, TAU)
          } else {
            moved.push(x0 + dx, y0 + dy, g)
          }
        }
      }
      ctx.fillStyle = `rgba(${ink},${REST})`
      ctx.fill()

      for (let n = 0; n < moved.length; n += 3) {
        const g = Math.min(1, moved[n + 2])
        ctx.beginPath()
        ctx.arc(moved[n], moved[n + 1], DOT + GROW * g, 0, TAU)
        ctx.fillStyle = `rgba(${ink},${(REST + (PEAK - REST) * g).toFixed(3)})`
        ctx.fill()
      }
    }

    const tick = (now: number) => {
      frame = 0
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
      last = now

      // Measured each frame: the page may scroll under a mouse that stands still.
      const rect = canvas.getBoundingClientRect()
      const tx   = mouseX - rect.left
      const ty   = mouseY - rect.top
      const over = mouseOver && tx >= 0 && ty >= 0 && tx <= rect.width && ty <= rect.height

      // A lens that had gone comes back under the pointer, not from where it left.
      if (over && lens < 0.01) { lensX = tx; lensY = ty }
      const follow = 1 - Math.exp(-dt * 16)
      lensX += (tx - lensX) * follow
      lensY += (ty - lensY) * follow
      const target = over ? 1 : 0
      // In gently, out quicker.
      lens += (target - lens) * (1 - Math.exp(-dt * (target > lens ? 8 : 14)))
      if (!over && lens < 0.004) lens = 0

      rings = rings.filter((r) => now - r.t0 < RING_MS)
      draw(now)

      const settling = Math.abs(target - lens) > 0.002 || (lens > 0 && Math.hypot(tx - lensX, ty - lensY) > 0.25)
      if (settling || rings.length > 0) frame = requestAnimationFrame(tick)
      else last = 0
    }

    const wake = () => {
      if (live && !frame) frame = requestAnimationFrame(tick)
    }

    const ring = (x: number, y: number, amp: number) => {
      // Far enough to cross most of the screen from wherever it starts.
      const reach = Math.min(900, Math.max(420, Math.hypot(w, h) * 0.6))
      rings.push({ x, y, t0: performance.now(), amp, reach })
      if (rings.length > 4) rings.shift()
      wake()
    }

    // The lens follows a mouse only: a finger does not hover.
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      mouseX = e.clientX
      mouseY = e.clientY
      mouseOver = true
      wake()
    }
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      mouseOver = false
      wake()
    }
    // A ring for a click or a tap: not for a drag, a long press or the
    // start of a scroll (which the browser cancels).
    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary || e.button !== 0) return
      press = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId }
    }
    const onUp = (e: PointerEvent) => {
      const p = press
      press = null
      if (!p || p.id !== e.pointerId) return
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10 || e.timeStamp - p.t > 600) return
      const rect = canvas.getBoundingClientRect()
      ring(e.clientX - rect.left, e.clientY - rect.top, 1)
    }
    const onCancel = () => { press = null }
    const onScroll = () => { if (mouseOver || lens > 0) wake() }

    // A new size clears the canvas, and a new theme changes the ink: draw
    // again at once, before the frame is painted.
    const resized = new ResizeObserver(() => { size(); draw(performance.now()) })
    const themed  = new MutationObserver(() => { readInk(); draw(performance.now()) })

    const start = () => {
      if (live) return
      live = true
      readInk()
      size()
      draw(performance.now())
      // The dots are on the canvas: it takes over from the CSS grid now,
      // in the same frame.
      box.dataset.live = ''
      section.addEventListener('pointermove', onMove, { passive: true })
      section.addEventListener('pointerleave', onLeave, { passive: true })
      section.addEventListener('pointerdown', onDown, { passive: true })
      section.addEventListener('pointerup', onUp, { passive: true })
      section.addEventListener('pointercancel', onCancel, { passive: true })
      window.addEventListener('scroll', onScroll, { passive: true })
      resized.observe(box)
      themed.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

      // Once a visit, the first ring. If storage is blocked, there is none.
      try {
        if (!sessionStorage.getItem(INTRO_KEY)) {
          intro = window.setTimeout(() => {
            try { sessionStorage.setItem(INTRO_KEY, '1') } catch { /* see above */ }
            ring(w / 2, h * 0.45, 0.8)
          }, 800)
        }
      } catch { /* see above */ }
    }

    const stop = () => {
      if (!live) return
      live = false
      delete box.dataset.live
      section.removeEventListener('pointermove', onMove)
      section.removeEventListener('pointerleave', onLeave)
      section.removeEventListener('pointerdown', onDown)
      section.removeEventListener('pointerup', onUp)
      section.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('scroll', onScroll)
      resized.disconnect()
      themed.disconnect()
      window.clearTimeout(intro)
      cancelAnimationFrame(frame)
      frame = 0
      last = 0
      rings = []
      lens = 0
      mouseOver = false
      press = null
    }

    // Reduced motion: the CSS grid, still. The setting can change while the
    // page is open, and so does the grid.
    const onPreference = () => (reduced.matches ? stop() : start())
    if (!reduced.matches) start()
    reduced.addEventListener('change', onPreference)
    return () => {
      reduced.removeEventListener('change', onPreference)
      stop()
    }
  }, [])

  return (
    <div ref={boxRef} className="hero-dots absolute inset-0" style={{ maskImage: MASK, WebkitMaskImage: MASK }}>
      <div
        className="hero-dots-static absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgb(var(--dot) / 0.38) 1px, transparent 1px)',
          backgroundSize:  `${STEP}px ${STEP}px`,
        }}
      />
      <canvas ref={canvasRef} className="hero-dots-live absolute inset-0 h-full w-full" />
    </div>
  )
}
