'use client'

import { useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
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
  label:        string
  heading:      string
  interaction?: MapInteraction
}

/**
 * "Geography": a dotted world map with the countries the studio has worked
 * for lit and breathing, and their cities pulsing. Props only, so the admin
 * can show the very same section while its list is being edited.
 *
 * The map is decoration (aria-hidden); the list under it says the same in
 * words, for people and for search engines. Hovering a country there lights
 * it on the map and names its cities.
 *
 * It sits under the marquee, whose bottom line is its top edge, so it draws
 * only the line below itself.
 */
export function WorldMapSection({ countries, label, heading, interaction }: Props) {
  const ref      = useRef<HTMLElement>(null)
  const inView   = useInView(ref, { once: true, margin: '-10% 0px' })
  const onScreen = useInView(ref)
  const [active, setActive] = useState<string | null>(null)
  const present = useRef<Set<string> | null>(null)

  if (countries.length === 0 && !interaction) return null

  // A country is marked by its cities, or, with none, by a point of its own.
  const markers = countries.flatMap((c) =>
    c.cities.length > 0
      ? c.cities.map((city) => ({ id: city.id, code: c.code, name: city.name, lat: city.lat, lng: city.lng }))
      : [{ id: `country-${c.code}`, code: c.code, name: c.name, lat: c.lat, lng: c.lng }],
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

  // A hover effect, so a mouse only: a tap would leave it stuck on.
  const hover = (code: string | null) => (e: PointerEvent) => {
    if (e.pointerType === 'mouse') setActive(code)
  }

  return (
    <section
      ref={ref}
      className="px-6 md:px-10 py-20 md:py-28 border-b border-maze-border overflow-hidden"
    >
      <div className="max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="mb-12 md:mb-16 max-w-4xl">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="label-sm text-maze-muted mb-3"
          >
            {label}
          </motion.p>
          <div className="reveal-mask">
            <motion.h2
              initial={{ y: '135%' }}
              animate={inView ? { y: '0%' } : {}}
              transition={{ duration: 0.85, ease: EASE_OUT }}
              className="display-md text-maze-cream"
            >
              {heading}
            </motion.h2>
          </div>
        </div>

        {/* Map */}
        <div
          className={`world-map relative w-full ${interaction?.className ?? ''}`}
          style={{ aspectRatio: `${MAP_COLS} / ${MAP_ROWS}` }}
          data-in={inView ? '' : undefined}
          data-paused={inView && !onScreen ? '' : undefined}
          onClick={interaction?.onClick}
          onPointerMove={interaction?.onPointerMove}
          onPointerLeave={interaction?.onPointerLeave}
        >
          <div className="world-map-base absolute inset-0" aria-hidden="true" />

          {countries.map((c, i) => c.layer ? (
            <div
              key={c.code}
              className={`world-map-layer absolute ${active && active !== c.code ? 'is-dimmed' : ''}`}
              style={{
                left:   `${c.layer.box.left}%`,
                top:    `${c.layer.box.top}%`,
                width:  `${c.layer.box.width}%`,
                height: `${c.layer.box.height}%`,
              }}
              aria-hidden="true"
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
                className={`world-map-marker ${active === m.code ? 'is-active' : ''} ${active && active !== m.code ? 'is-dimmed' : ''}`}
                data-edge={x < 7 ? 'start' : x > 93 ? 'end' : undefined}
                style={{
                  left:     `${x}%`,
                  top:      `${y}%`,
                  '--in':   startAt(m.id, markerFrom + i * markerStep),
                  '--beat': `${((i * 0.83) % 2.8).toFixed(2)}s`,
                } as CSSProperties}
                aria-hidden="true"
              >
                <span className="world-map-ping" />
                <span className="world-map-dot" />
                <span className="world-map-label">{m.name}</span>
              </span>
            )
          })}

          {interaction?.overlay}
        </div>

        {/* The same, in words */}
        {countries.length > 0 && (
          <ul className="mt-12 md:mt-16 pt-10 border-t border-maze-border grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-6 md:gap-y-8">
            {countries.map((c, i) => (
              <motion.li
                key={c.code}
                initial={{ opacity: 0, y: 8 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + i * 0.05, duration: 0.5, ease: EASE_OUT }}
                onPointerEnter={hover(c.code)}
                onPointerLeave={hover(null)}
              >
                <div className={`transition-opacity duration-200 ${active && active !== c.code ? 'opacity-40' : ''}`}>
                  <p className="flex items-center gap-2.5 text-base md:text-lg font-semibold text-maze-cream leading-snug">
                    <span className="w-1.5 h-1.5 rounded-full bg-maze-lime shrink-0" aria-hidden="true" />
                    {c.name}
                  </p>
                  {c.cities.length > 0 && (
                    <p className="text-sm text-maze-muted mt-1.5 pl-4 leading-relaxed">
                      {c.cities.map((city) => city.name).join(' · ')}
                    </p>
                  )}
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
