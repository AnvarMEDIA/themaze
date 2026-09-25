import Image from 'next/image'
import type { Partner } from '@/lib/partners'
import type { Testimonial } from '@/lib/testimonials'
import { SectionHead } from './SectionHead'

interface Props {
  heading:      string
  partners:     Partner[]
  testimonials: Testimonial[]
  locale:       string
}

/**
 * Who the studio has worked for, and what they said.
 *
 * The names are set as a line of type rather than a grid of greyed-out
 * logos: six logos at six different weights never sit together, and a
 * branding studio's own typography is the better credential. The logos stay
 * in the admin for anywhere else they are needed.
 *
 * Testimonials follow without stars — a row of five lime stars on every
 * quote says nothing the quote doesn't, and the rating still goes into the
 * structured data for search.
 */
type Part = { type: 'element'; index: number } | { type: 'literal'; value: string }

/**
 * The names as a sentence — "Uzum Market, Kapital Bank … and Payme." — with
 * the commas and the "and" (or "и") that the locale itself uses. A sentence
 * wraps well at any width; a row of names with slashes between them leaves
 * a slash hanging at the end of every line on a phone.
 */
function names(partners: Partner[], locale: string): Part[] {
  const list = partners.map((p) => p.name)
  let n = 0
  try {
    return new Intl.ListFormat(locale === 'ru' ? 'ru' : 'en-GB', { style: 'long', type: 'conjunction' })
      .formatToParts(list)
      .map((part) => (part.type === 'element' ? { type: 'element', index: n++ } : { type: 'literal', value: part.value }))
  } catch {
    return list.flatMap((_, i) => (i === 0 ? [{ type: 'element', index: i }] : [{ type: 'literal', value: ', ' }, { type: 'element', index: i }])) as Part[]
  }
}

export function ClientsSection({ heading, partners, testimonials, locale }: Props) {
  if (partners.length === 0 && testimonials.length === 0) return null
  const isRu = locale === 'ru'

  return (
    <section className="px-6 md:px-10 py-12 md:py-16">
      <div className="max-w-[1440px] mx-auto">
        <SectionHead title={heading} />

        {partners.length > 0 && (
          <p className="max-w-[72rem] heading-lg text-maze-muted text-pretty">
            {names(partners, locale).map((part, i) => {
              if (part.type === 'literal') return <span key={i}>{part.value}</span>
              const p = partners[part.index]
              return p.url ? (
                <a
                  key={i}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-maze-cream transition-colors duration-200 [@media(hover:hover)_and_(pointer:fine)]:hover:text-maze-lime"
                >
                  {p.name}
                </a>
              ) : (
                <span key={i} className="text-maze-cream">{p.name}</span>
              )
            })}
            .
          </p>
        )}

        {testimonials.length > 0 && (
          <div className="mt-14 md:mt-20 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-12">
            {testimonials.map((t) => {
              const role  = isRu && t.roleRu  ? t.roleRu  : t.role
              const quote = isRu && t.quoteRu ? t.quoteRu : t.quote
              return (
                <figure key={t.id} className="border-t border-maze-border pt-6">
                  <blockquote className="text-lg md:text-xl leading-relaxed text-maze-cream text-pretty">
                    &ldquo;{quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    {t.avatar && (
                      <span className="relative w-10 h-10 rounded-full overflow-hidden bg-maze-gray shrink-0">
                        <Image src={t.avatar} alt="" fill sizes="40px" className="object-cover" />
                      </span>
                    )}
                    <span>
                      <span className="block text-sm font-semibold text-maze-cream">{t.author}</span>
                      {role && <span className="block text-sm text-maze-muted">{role}</span>}
                    </span>
                  </figcaption>
                </figure>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
