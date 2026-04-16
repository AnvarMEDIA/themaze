import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import { getAllProjects } from '@/lib/portfolio'
import { getSettings } from '@/lib/settings'
import { CATEGORY_LABELS } from '@/lib/utils'

interface Props {
  params: { locale: string }
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export const metadata: Metadata = {
  title: 'MAZE Studio — Branding & Design',
  description: 'We build brands that lead markets. Branding & design studio based in Tashkent.',
}

const SERVICES = [
  { num: '01', title: 'Brand Identity'    },
  { num: '02', title: 'Brand Strategy'    },
  { num: '03', title: 'Naming'            },
  { num: '04', title: 'UI / UX Design'    },
  { num: '05', title: 'Print & Packaging' },
  { num: '06', title: 'Motion Design'     },
]

const COL = 'px-6 md:px-12 lg:px-20'
const WRAP = 'max-w-[1440px] mx-auto'

export default async function NewPage({ params: { locale } }: Props) {
  setRequestLocale(locale)
  const projects = getAllProjects().slice(0, 7)
  const settings = getSettings()

  return (
    <main className="min-h-screen">

      {/* ─────────────────────────────── Hero ─────────────────────────────── */}
      <section className={`${COL} pt-36 pb-24 border-b border-maze-border`}>
        <div className={WRAP}>

          {/* Meta row */}
          <div className="flex items-center justify-between mb-20">
            <p className="label-sm text-maze-muted">
              Branding &amp; Design Studio — Tashkent, UZ
            </p>
            <p className="label-sm text-maze-muted hidden md:block">EST. 2019</p>
          </div>

          {/* Headline */}
          <h1 className="display-lg font-black text-maze-cream leading-[0.88] mb-16">
            We build brands<br className="hidden sm:block" /> that lead markets.
          </h1>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-8">
            <Link
              href="/contact"
              className="label-sm font-bold px-7 py-3.5 bg-maze-lime text-maze-ink rounded-full hover:bg-maze-paper transition-colors duration-200"
            >
              Start a project ↗
            </Link>
            <Link
              href="/portfolio"
              className="label-sm text-maze-muted hover:text-maze-cream transition-colors duration-200 group"
            >
              View all work
              <span className="ml-1 inline-block group-hover:translate-x-1 transition-transform duration-200">→</span>
            </Link>
          </div>

        </div>
      </section>

      {/* ──────────────────────────── Selected Work ───────────────────────── */}
      <section className={`${COL} py-16 border-b border-maze-border`}>
        <div className={WRAP}>

          <div className="flex items-baseline justify-between mb-10">
            <p className="label-sm text-maze-muted">Selected Work</p>
            <Link href="/portfolio" className="label-sm text-maze-muted hover:text-maze-lime transition-colors duration-200">
              All projects →
            </Link>
          </div>

          {/* Project rows */}
          <div className="border-t border-maze-border">
            {projects.map((project, i) => (
              <Link
                key={project.id}
                href={`/portfolio/${project.slug}`}
                className="group flex items-center justify-between py-5 border-b border-maze-border hover:bg-maze-dark -mx-6 md:-mx-12 lg:-mx-20 px-6 md:px-12 lg:px-20 transition-colors duration-150"
              >
                {/* Left: num + title + client */}
                <div className="flex items-baseline gap-5 md:gap-10 min-w-0 flex-1">
                  <span className="label-sm text-maze-muted tabular-nums shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="heading-md font-bold text-maze-cream group-hover:text-maze-lime transition-colors duration-150 truncate">
                    {project.title}
                  </span>
                  <span className="label-sm text-maze-muted hidden xl:block truncate shrink-0">
                    {project.client}
                  </span>
                </div>

                {/* Right: category + year + arrow */}
                <div className="flex items-center gap-5 md:gap-10 shrink-0 ml-4">
                  <span className="label-sm text-maze-muted hidden sm:block">
                    {CATEGORY_LABELS[project.category]}
                  </span>
                  <span className="label-sm text-maze-muted tabular-nums">
                    {project.year}
                  </span>
                  <span className="label-sm text-maze-muted group-hover:text-maze-lime group-hover:translate-x-0.5 transition-all duration-150">
                    ↗
                  </span>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* ──────────────────────────────── Services ────────────────────────── */}
      <section className={`${COL} py-16 border-b border-maze-border`}>
        <div className={WRAP}>

          <p className="label-sm text-maze-muted mb-10">Services</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <Link
                key={s.num}
                href={`/services#${s.title.toLowerCase().replace(/[\s/]+/g, '-')}`}
                className="group flex items-baseline gap-5 py-5 border-b border-maze-border hover:bg-maze-dark -mx-6 md:-mx-12 lg:-mx-20 px-6 md:px-12 lg:px-20 transition-colors duration-150"
              >
                <span className="label-sm text-maze-muted shrink-0">{s.num}</span>
                <span className="heading-md font-bold text-maze-cream group-hover:text-maze-lime transition-colors duration-150">
                  {s.title}
                </span>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* ───────────────────────────────── Stats ──────────────────────────── */}
      <section className={`${COL} py-16 border-b border-maze-border`}>
        <div className={`${WRAP} grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x md:divide-maze-border`}>
          {[
            { value: '200+', label: 'Projects' },
            { value: '80+',  label: 'Clients'  },
            { value: '6+',   label: 'Years'    },
            { value: '12',   label: 'Awards'   },
          ].map(({ value, label }) => (
            <div key={label} className="md:px-10 first:pl-0 last:pr-0">
              <p className="display-md font-black text-maze-lime leading-none">{value}</p>
              <p className="label-sm text-maze-muted mt-3">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────── Contact ──────────────────────────── */}
      <section className={`${COL} pt-24 pb-16`}>
        <div className={WRAP}>

          <p className="label-sm text-maze-muted mb-10">Let's work together</p>

          <h2 className="display-lg font-black text-maze-cream leading-[0.88] mb-16">
            Ready to start<br className="hidden sm:block" /> something?
          </h2>

          {/* Email — big clickable */}
          <a
            href={`mailto:${settings.email}`}
            className="display-md font-black text-maze-lime hover:text-maze-cream transition-colors duration-300 block mb-5"
          >
            {settings.email}
          </a>

          {/* Phone */}
          <a
            href={`tel:${settings.phone.replace(/\s/g, '')}`}
            className="heading-md font-semibold text-maze-muted hover:text-maze-cream transition-colors duration-200 block mb-16"
          >
            {settings.phone}
          </a>

          {/* Social strip */}
          <div className="flex flex-wrap gap-8 pt-10 border-t border-maze-border">
            {[
              { label: 'Instagram', href: settings.instagram },
              { label: 'Behance',   href: settings.behance   },
              { label: 'LinkedIn',  href: settings.linkedin  },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="label-sm text-maze-muted hover:text-maze-lime transition-colors duration-200"
              >
                {label} ↗
              </a>
            ))}
          </div>

        </div>
      </section>

    </main>
  )
}
