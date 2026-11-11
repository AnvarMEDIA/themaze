'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { STYLE_ART } from './styleArt'

// Strong ease-out curve (Emil Kowalski)
const EASE_OUT = [0.23, 1, 0.32, 1] as const

// When a sent brief's stamp comes down: after the thank-you has settled, s.
const STAMP_DELAY = 0.35

export interface SheetData {
  name:        string
  company:     string
  description: string
  services:    string[]
  styles:      string[]
  colors:      string[]
  timeline:    string
  budget:      string
}

export interface SheetOption  { id: string; label: string }
export interface SheetPalette extends SheetOption { swatches: string[] }

interface Props {
  data:       SheetData
  services:   SheetOption[]
  styles:     SheetOption[]
  palettes:   SheetPalette[]
  /** Sent: the studio's stamp goes on it. */
  stamped?:   boolean
  className?: string
}

/** The options picked, in the order they were picked. */
function picked<T extends SheetOption>(all: T[], ids: string[]): T[] {
  return ids.map((id) => all.find((o) => o.id === id)).filter((o): o is T => o !== undefined)
}

/**
 * The brief as a document: a sheet of paper that fills in while the form is
 * being filled. The company's name goes on top as it is typed, a service
 * clicked becomes a numbered line, a style its drawing, a palette its
 * swatches; what is still empty is a dashed line waiting for it. Sent, it
 * gets the studio's stamp.
 *
 * Beside the form on a wide screen, in the last step on a narrow one (to
 * check before sending), and on the thank-you screen. It only shows what
 * the form holds, so it needs a script: without one it is hidden
 * (components/NoScriptStyles).
 *
 * What the sheet holds when it first appears is drawn as it is; only what
 * is added after that comes in with a movement. Typing is never animated.
 */
export function BriefSheet({ data, services, styles, palettes, stamped = false, className }: Props) {
  const t      = useTranslations('brief.sheet')
  const locale = useLocale()
  const reduce = useReducedMotion()

  // The visitor's own date, read on their machine once the page runs: the
  // server's clock and time zone are not theirs.
  const [today, setToday] = useState<Date | null>(null)
  useEffect(() => { setToday(new Date()) }, [])
  const ready = today !== null

  const chosenServices = picked(services, data.services)
  const chosenStyles   = picked(styles,   data.styles)
  const chosenPalettes = picked(palettes, data.colors)
  const company        = data.company.trim()
  const name           = data.name.trim()
  const title          = company || name
  const task           = data.description.trim()

  const parts  = [title, task, chosenServices.length, chosenStyles.length, chosenPalettes.length, data.timeline, data.budget]
  const filled = parts.filter(Boolean).length

  // A block that was empty and now has something: it fades in. An item
  // added to a list: it rises a few pixels into place as well. Removing is
  // instant, the fastest exit there is.
  const fadeIn = ready ? { opacity: 0 } : false
  const fade   = { duration: 0.16, ease: EASE_OUT }
  const rise   = ready ? (reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(4px) scale(0.96)' }) : false
  const risen  = reduce ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px) scale(1)' }
  const quick  = { duration: 0.2, ease: EASE_OUT }

  const longDate  = today ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(today) : ''
  const shortDate = today ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: '2-digit' }).format(today) : ''

  return (
    <div className={cn('relative', className)}>
      {/* Crop marks, as on a sheet sent to print. */}
      <span aria-hidden="true" className="brief-crop" />

      <article className="brief-sheet relative rounded-md border border-maze-border bg-white px-6 py-5 dark:bg-maze-dark xl:px-7">
        <div className="flex items-baseline justify-between gap-4 text-[10px] uppercase tracking-[0.2em]">
          <span className="font-bold text-maze-cream">MAZE Studio</span>
          <span className="tabular-nums text-maze-muted">{longDate}</span>
        </div>

        <h3 className="mt-6 text-[10px] uppercase tracking-[0.2em] text-maze-muted">{t('title')}</h3>
        {title ? (
          <motion.div initial={fadeIn} animate={{ opacity: 1 }} transition={fade} className="mt-2">
            <p className="line-clamp-2 break-words text-xl font-bold leading-tight text-maze-cream">{title}</p>
            {company && name && (
              <p className="mt-1 line-clamp-1 break-words text-[13px] text-maze-muted">{name}</p>
            )}
          </motion.div>
        ) : (
          <Blank empty={t('empty')} className="mt-2" tall />
        )}

        <dl className="mt-6 grid grid-cols-2 gap-x-4">
          <Field label={t('task')} wide>
            {task ? (
              <motion.p
                initial={fadeIn} animate={{ opacity: 1 }} transition={fade}
                className="line-clamp-4 whitespace-pre-line break-words"
              >
                {task}
              </motion.p>
            ) : (
              <Blank empty={t('empty')} lines={2} />
            )}
          </Field>

          <Field label={t('services')} wide>
            {chosenServices.length > 0 ? (
              <motion.ol initial={fadeIn} animate={{ opacity: 1 }} transition={fade} className="columns-2 gap-x-4">
                {chosenServices.map((s, i) => (
                  <motion.li
                    key={s.id}
                    initial={rise} animate={risen} transition={quick}
                    className="flex gap-2 break-inside-avoid"
                  >
                    <span className="tabular-nums text-maze-muted">{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 break-words">{s.label}</span>
                  </motion.li>
                ))}
              </motion.ol>
            ) : (
              <Blank empty={t('empty')} short />
            )}
          </Field>

          <Field label={t('style')}>
            {chosenStyles.length > 0 ? (
              <motion.div initial={fadeIn} animate={{ opacity: 1 }} transition={fade}>
                <ul className="flex flex-wrap gap-1.5">
                  {chosenStyles.map((s) => (
                    <motion.li
                      key={s.id} title={s.label}
                      initial={rise} animate={risen} transition={quick}
                      className="h-8 w-8 rounded border border-maze-border p-1 text-maze-cream"
                    >
                      {STYLE_ART[s.id]}
                      <span className="sr-only">{s.label}</span>
                    </motion.li>
                  ))}
                </ul>
                <p aria-hidden="true" className="mt-2 text-[11px] leading-snug text-maze-muted">
                  {chosenStyles.map((s) => s.label).join(' · ')}
                </p>
              </motion.div>
            ) : (
              <Placeholders empty={t('empty')} shape="h-8 w-8 rounded" />
            )}
          </Field>

          <Field label={t('colors')}>
            {chosenPalettes.length > 0 ? (
              <motion.div initial={fadeIn} animate={{ opacity: 1 }} transition={fade}>
                <ul className="flex flex-wrap gap-1.5">
                  {chosenPalettes.map((p) => (
                    <motion.li
                      key={p.id} title={p.label}
                      initial={rise} animate={risen} transition={quick}
                      className="flex h-4 w-12 overflow-hidden rounded-full border border-maze-border"
                    >
                      {p.swatches.map((hex, i) => (
                        <span key={i} aria-hidden="true" className="flex-1" style={{ backgroundColor: hex }} />
                      ))}
                      <span className="sr-only">{p.label}</span>
                    </motion.li>
                  ))}
                </ul>
                <p aria-hidden="true" className="mt-2 text-[11px] leading-snug text-maze-muted">
                  {chosenPalettes.map((p) => p.label).join(' · ')}
                </p>
              </motion.div>
            ) : (
              <Placeholders empty={t('empty')} shape="h-4 w-12 rounded-full" />
            )}
          </Field>

          <Field label={t('timeline')}>
            {data.timeline ? (
              <motion.span key={data.timeline} initial={fadeIn} animate={{ opacity: 1 }} transition={fade} className="block">
                {data.timeline}
              </motion.span>
            ) : (
              <Blank empty={t('empty')} />
            )}
          </Field>

          <Field label={t('budget')}>
            {data.budget ? (
              <motion.span key={data.budget} initial={fadeIn} animate={{ opacity: 1 }} transition={fade} className="block">
                {data.budget}
              </motion.span>
            ) : (
              <Blank empty={t('empty')} />
            )}
          </Field>
        </dl>

        <div className="flex items-center gap-5 border-t border-maze-border pt-4">
          <div className="min-w-0 flex-1">
            <span className="block whitespace-nowrap text-[10px] uppercase tabular-nums tracking-[0.2em] text-maze-muted">
              {t('filled', { done: filled, total: parts.length })}
            </span>
            <span aria-hidden="true" className="relative mt-2.5 block h-px overflow-hidden bg-maze-border">
              <span
                className="brief-progress absolute inset-0 origin-left bg-maze-cream"
                style={{ transform: `scaleX(${filled / parts.length})` }}
              />
            </span>
          </div>

          {/* The place for the stamp, marked as on a paper form («М.П.»,
              locus sigilli). Once the brief is sent, the stamp lands on it
              and the mark goes under the ink. */}
          <div aria-hidden="true" className="relative h-[72px] w-[72px] shrink-0">
            <motion.span
              className="absolute inset-0 flex items-center justify-center rounded-full border border-dashed border-maze-border text-[10px] tracking-[0.15em] text-maze-muted"
              animate={{ opacity: stamped && ready ? 0 : 1 }}
              transition={{ delay: stamped ? STAMP_DELAY + 0.1 : 0, duration: 0.12 }}
            >
              {t('seal')}
            </motion.span>
            {stamped && ready && <Stamp label={t('stamp')} date={shortDate} />}
          </div>
        </div>
      </article>
    </div>
  )
}

/** One entry of the sheet: a label over its value, across both columns or in one. */
function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={cn('min-w-0 border-t border-maze-border pb-3.5 pt-3', wide && 'col-span-2')}>
      <dt className="mb-2 text-[10px] uppercase tracking-[0.2em] text-maze-muted">{label}</dt>
      <dd className="text-[13px] leading-relaxed text-maze-cream">{children}</dd>
    </div>
  )
}

/** An empty line on the form, waiting to be written on. */
function Blank({ empty, lines = 1, short = false, tall = false, className }: {
  empty: string; lines?: number; short?: boolean; tall?: boolean; className?: string
}) {
  return (
    <span className={cn('block space-y-2', className)}>
      <span className="sr-only">{empty}</span>
      {Array.from({ length: lines }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn(
            'block border-b border-dashed border-maze-border',
            tall ? 'h-7' : 'h-4',
            (short || (lines > 1 && i === lines - 1)) && 'w-2/3',
          )}
        />
      ))}
    </span>
  )
}

/** Empty frames where the drawings or the swatches will go. */
function Placeholders({ empty, shape }: { empty: string; shape: string }) {
  return (
    <span className="flex gap-1.5">
      <span className="sr-only">{empty}</span>
      {[0, 1].map((i) => (
        <span key={i} aria-hidden="true" className={cn('block border border-dashed border-maze-border', shape)} />
      ))}
    </span>
  )
}

/**
 * The studio's round stamp, pressed on a sent brief in the place marked for
 * it: it lands from a little above the paper (scaling down, quick ease-out),
 * the way a stamp does. Decoration: the screen beside it says the same in
 * words.
 */
function Stamp({ label, date }: { label: string; date: string }) {
  const reduce = useReducedMotion()
  const ring   = `stamp-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`
  const R      = 45

  return (
    <motion.div
      className="brief-stamp pointer-events-none absolute -inset-4 text-maze-cream"
      initial={reduce ? { opacity: 0, transform: 'rotate(-12deg) scale(1)' } : { opacity: 0, transform: 'rotate(-12deg) scale(1.3)' }}
      animate={{ opacity: 0.9, transform: 'rotate(-12deg) scale(1)' }}
      transition={{ delay: STAMP_DELAY, duration: 0.24, ease: EASE_OUT }}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full overflow-visible">
        <defs>
          <path id={ring} d={`M60,60 m-${R},0 a${R},${R} 0 1,1 ${2 * R},0 a${R},${R} 0 1,1 -${2 * R},0`} />
        </defs>
        <circle cx="60" cy="60" r="57" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="60" cy="60" r="33" fill="none" stroke="currentColor" strokeWidth="1" />
        <text fill="currentColor" fontSize="10.5" fontWeight="800">
          <textPath href={`#${ring}`} textLength={Math.round(2 * Math.PI * R) - 4} lengthAdjust="spacing">
            {`MAZE STUDIO • ${label.toUpperCase()} •`}
          </textPath>
        </text>
        <text x="60" y="64.5" textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="800" letterSpacing="0.5">
          {date}
        </text>
      </svg>
    </motion.div>
  )
}
