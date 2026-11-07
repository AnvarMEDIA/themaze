'use client'

import { useEffect, useRef, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { motion, useInView } from 'framer-motion'
import type { SectionCountry } from '@/lib/geo/mapData'
import { MAP_COLS, MAP_ROWS, toMap } from '@/lib/geo/projection'

const EASE_OUT = [0.23, 1, 0.32, 1] as const

/** For the admin editor only, which places cities and countries by clicking the map. */
export interface MapInteraction {
  className?:      string
  onClick?:        (e: MouseEvent<HTMLDivElement>) => void
  onPointerMove?:  (e: PointerEvent<HTMLDivElement>) => void
  onPointerLeave?: (e: PointerEvent<HTMLDivElement>) => void
  /** Drawn over the map, in the same box. */
  overlay?:        ReactNode
}

interface Props {
  countries:    SectionCountry[]
  heading:      string
  interaction?: MapInteraction
}

/**
 * "Projects around the world": a dotted world map with the countries the
 * studio has worked for lit and breathing, and their cities pulsing; a
 * city's name shows on hover. Props only, so the admin can show the very
 * same section while its list is being edited.
 *
 * The map is decoration (aria-hidden). Screen readers and search engines get
 * the same list in words, visually hidden.
 *
 * The heading stays on one line at every width: the site's heading size,
 * made smaller wherever that would wrap (see .world-map-heading).
 *
 * It sits under the marquee, whose bottom line is its top edge, so it draws
 * only the line below itself.
 */
export function WorldMapSection({ countries, heading, interaction }: Props) {
  const ref        = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const inView     = useInView(ref, { once: true, margin: '-10% 0px' })
  const onScreen   = useInView(ref)
  const present    = useRef<Set<string> | null>(null)

  // How wide the heading is per em of type, measured once its font is in:
  // that sets the size, in container units, at which it just fits one line
  // (--fit). The stylesheet's fallback fits the current headings already;
  // this keeps any other wording on one line too.
  useEffect(() => {
    const el = headingRef.current
    if (!el?.parentElement) return
    let live = true
    const measure = () => {
      if (!live) return
      const probe = el.cloneNode(true) as HTMLElement
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-size:100px;transform:none'
      el.parentElement!.appendChild(probe)
      const perEm = probe.getBoundingClientRect().width / 100
      probe.remove()
      if (perEm > 0) el.style.setProperty('--fit', `${(97 / perEm).toFixed(3)}cqi`)
    }
    if (document.fonts?.ready) document.fonts.ready.then(measure)
    else measure()
    return () => { live = false }
  }, [heading])

  if (countries.length === 0 && !interaction) return null

  // A country is marked by its cities, or, with none, by a point of its own.
  const markers = countries.flatMap((c) =>
    c.cities.length > 0
      ? c.cities.map((city) => ({ id: city.id, name: city.name, lat: city.lat, lng: city.lng }))
      : [{ id: `country-${c.code}`, name: c.name, lat: c.lat, lng: c.lng }],
  )

  // The entrance, in ms: the dots fade in, the countries light one after
  // another, then the cities appear. Long lists share the same total time.
  // After it each country breathes and each city pulses on a beat of its
  // own (--beat), so they twinkle rather than blink in unison.
  const countryStep = Math.min(80, 640 / Math.max(countries.length, 1))
  const markerFrom  = 300 + countries.length * countryStep
  const markerStep  = Math.min(60, 720 / Math.max(markers.length, 1))

  // What was on the map as it came into view plays the entrance; anything
  // added later (in the admin's preview) lights up at once.
  if (inView && present.current === null) {
    present.current = new Set([...countries.map((c) => c.code), ...markers.map((m) => m.id)])
  }
  const startAt = (key: string, ms: number) =>
    `${present.current && !present.current.has(key) ? 0 : Math.round(ms)}ms`

  return (
    <section
      ref={ref}
      className="px-6 md:px-10 pt-16 md:pt-24 pb-16 md:pb-24 border-b border-maze-border overflow-hidden"
    >
      <div className="max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="world-map-head mb-8 md:mb-12">
          <div className="reveal-mask">
            <motion.h2
              ref={headingRef}
              initial={{ y: '135%' }}
              animate={inView ? { y: '0%' } : {}}
              transition={{ duration: 0.85, ease: EASE_OUT }}
              className="world-map-heading display-md text-maze-cream"
            >
              {heading}
            </motion.h2>
          </div>
        </div>

        {/* The map's content, in words */}
        {countries.length > 0 && (
          <ul className="sr-only">
            {countries.map((c) => (
              <li key={c.code}>
                {c.name}{c.cities.length > 0 ? `: ${c.cities.map((city) => city.name).join(', ')}` : ''}
              </li>
            ))}
          </ul>
        )}

        {/* Map */}
        <div
          className={`world-map relative w-full ${interaction?.className ?? ''}`}
          style={{ aspectRatio: `${MAP_COLS} / ${MAP_ROWS}` }}
          data-in={inView ? '' : undefined}
          data-paused={inView && !onScreen ? '' : undefined}
          onClick={interaction?.onClick}
          onPointerMove={interaction?.onPointerMove}
          onPointerLeave={interaction?.onPointerLeave}
          aria-hidden="true"
        >
          <div className="world-map-base absolute inset-0" />

          {countries.map((c, i) => c.layer ? (
            <div
              key={c.code}
              className="world-map-layer absolute"
              style={{
                left:   `${c.layer.box.left}%`,
                top:    `${c.layer.box.top}%`,
                width:  `${c.layer.box.width}%`,
                height: `${c.layer.box.height}%`,
              }}
            >
              <svg
                viewBox={c.layer.viewBox}
                preserveAspectRatio="none"
                className="world-map-country block w-full h-full overflow-visible"
                style={{
                  '--in':   startAt(c.code, 300 + i * countryStep),
                  '--beat': `${((i * 1.37) % 4).toFixed(2)}s`,
                } as CSSProperties}
              >
                <path d={c.layer.path} fill="none" stroke="currentColor" strokeWidth={0.5} strokeLinecap="round" />
              </svg>
            </div>
          ) : null)}

          {markers.map((m, i) => {
            const { x, y } = toMap(m.lat, m.lng)
            return (
              <span
                key={m.id}
                className="world-map-marker"
                data-edge={x < 7 ? 'start' : x > 93 ? 'end' : undefined}
                style={{
                  left:     `${x}%`,
                  top:      `${y}%`,
                  '--in':   startAt(m.id, markerFrom + i * markerStep),
                  '--beat': `${((i * 0.83) % 2.8).toFixed(2)}s`,
                } as CSSProperties}
              >
                <span className="world-map-ping" />
                <span className="world-map-dot" />
                <span className="world-map-label">{m.name}</span>
              </span>
            )
          })}

          {interaction?.overlay}
        </div>
      </div>
    </section>
  )
}
