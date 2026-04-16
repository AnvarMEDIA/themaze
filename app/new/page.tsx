import Link from 'next/link'
import { getAllProjects } from '@/lib/portfolio'
import { getSettings } from '@/lib/settings'
import { CATEGORY_LABELS } from '@/lib/utils'

/* ── Constants ─────────────────────────────────────────────────────── */

const SERVICES = [
  { num: '01', title: 'Brand Identity',    desc: 'Logo, colour, type, imagery — the full visual system.' },
  { num: '02', title: 'Brand Strategy',    desc: 'Positioning, naming, messaging and differentiation.'   },
  { num: '03', title: 'Naming',            desc: 'Brand names that work across languages and markets.'   },
  { num: '04', title: 'UI / UX Design',    desc: 'Digital products that earn trust at every touchpoint.' },
  { num: '05', title: 'Print & Packaging', desc: 'Physical communication with craft and impact.'        },
  { num: '06', title: 'Motion Design',     desc: 'Animation and video that bring identity to life.'     },
]

const CATEGORY_DOT: Record<string, string> = {
  branding: '#C8FF47',
  identity: '#4B6EF5',
  'ui-ux':  '#06D6A0',
  print:    '#FF9E00',
  motion:   '#B47AEA',
  naming:   '#FF4D1C',
  strategy: '#D4A017',
}

const B  = '#080808'   // background
const S  = '#111111'   // surface
const BR = '#1c1c1c'   // border
const T  = '#EDEBE3'   // text
const M  = '#5a5a5a'   // muted
const L  = '#C8FF47'   // lime

/* ── Page ──────────────────────────────────────────────────────────── */

export default async function NewPage() {
  const projects = getAllProjects().slice(0, 7)
  const settings = getSettings()

  return (
    <main style={{ paddingTop: '64px' }}>

      {/* ══════════════════════════════ HERO ══════════════════════════ */}
      <section style={{ borderBottom: `1px solid ${BR}`, padding: '80px 0' }}>
        <div className="px-6 md:px-12 lg:px-20 max-w-[1440px] mx-auto">

          {/* Meta strip */}
          <div className="flex items-center justify-between" style={{ marginBottom: '56px' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: M }}>
              Branding &amp; Design Studio — Tashkent, Uzbekistan
            </span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: M }} className="hidden md:block">
              Est. 2019
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-black leading-[0.87]"
            style={{ fontSize: 'clamp(3.5rem, 9vw, 11rem)', letterSpacing: '-0.03em', color: T, marginBottom: '48px', maxWidth: '900px' }}
          >
            We build<br />brands that<br />
            <span style={{ color: L }}>lead markets.</span>
          </h1>

          {/* Sub + CTAs */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
            <p style={{ fontSize: 'clamp(1rem, 1.2vw, 1.125rem)', lineHeight: '1.7', color: M, maxWidth: '340px' }}>
              We partner with ambitious companies to craft identities, digital products and strategies that grow markets.
            </p>
            <div className="flex items-center gap-6 shrink-0">
              <Link
                href="/contact"
                style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: L, color: '#0A0A0A', padding: '14px 28px', borderRadius: '99px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                className="hover:bg-[#F0EEE6] transition-colors duration-200"
              >
                Start a project ↗
              </Link>
              <Link
                href="/portfolio"
                style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: M }}
                className="hover:text-white transition-colors duration-200 group"
              >
                View work <span className="group-hover:translate-x-1 inline-block transition-transform duration-200">→</span>
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════ SELECTED WORK ═════════════════════ */}
      <section style={{ borderBottom: `1px solid ${BR}`, padding: '64px 0' }}>
        <div className="px-6 md:px-12 lg:px-20 max-w-[1440px] mx-auto">

          {/* Section header */}
          <div className="flex items-baseline justify-between" style={{ marginBottom: '40px' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: M }}>
              Selected Work
            </span>
            <Link
              href="/portfolio"
              style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: M }}
              className="hover:text-[#C8FF47] transition-colors duration-200"
            >
              All projects →
            </Link>
          </div>

          {/* Rows */}
          <div style={{ borderTop: `1px solid ${BR}` }}>
            {projects.map((project, i) => (
              <Link
                key={project.id}
                href={`/portfolio/${project.slug}`}
                className="group flex items-center justify-between -mx-6 md:-mx-12 lg:-mx-20 px-6 md:px-12 lg:px-20 transition-colors duration-150"
                style={{ borderBottom: `1px solid ${BR}`, padding: '20px 0' }}
              >
                {/* Left */}
                <div className="flex items-center gap-4 md:gap-8 min-w-0 flex-1" style={{ paddingLeft: '0' }}>
                  {/* Category dot */}
                  <span
                    className="shrink-0 rounded-full"
                    style={{ width: '6px', height: '6px', background: CATEGORY_DOT[project.category] ?? L, flexShrink: 0 }}
                  />
                  {/* Index */}
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', color: M, fontVariantNumeric: 'tabular-nums', minWidth: '24px', flexShrink: 0 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {/* Title */}
                  <span
                    className="font-bold truncate transition-colors duration-150 group-hover:text-[#C8FF47]"
                    style={{ fontSize: 'clamp(1.25rem, 2vw, 2rem)', fontWeight: 700, lineHeight: '1.2', letterSpacing: '-0.01em', color: T }}
                  >
                    {project.title}
                  </span>
                  {/* Client */}
                  <span className="hidden xl:block truncate shrink-0" style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: M }}>
                    {project.client}
                  </span>
                </div>

                {/* Right */}
                <div className="flex items-center gap-6 md:gap-10 shrink-0 ml-4">
                  <span className="hidden sm:block" style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: M }}>
                    {CATEGORY_LABELS[project.category]}
                  </span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', color: M, fontVariantNumeric: 'tabular-nums' }}>
                    {project.year}
                  </span>
                  <span
                    className="transition-all duration-150 group-hover:text-[#C8FF47] group-hover:translate-x-0.5"
                    style={{ color: M, fontSize: '0.875rem' }}
                  >
                    ↗
                  </span>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* ════════════════════════════ SERVICES ════════════════════════ */}
      <section style={{ borderBottom: `1px solid ${BR}`, padding: '64px 0' }}>
        <div className="px-6 md:px-12 lg:px-20 max-w-[1440px] mx-auto">

          <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: M, display: 'block', marginBottom: '40px' }}>
            Services
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ borderTop: `1px solid ${BR}` }}>
            {SERVICES.map((s) => (
              <div
                key={s.num}
                className="group"
                style={{ padding: '28px 0', borderBottom: `1px solid ${BR}`, paddingRight: '32px' }}
              >
                <div className="flex items-baseline gap-4" style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', color: M, minWidth: '28px', flexShrink: 0 }}>
                    {s.num}
                  </span>
                  <span
                    className="font-bold"
                    style={{ fontSize: 'clamp(1.25rem, 1.8vw, 1.75rem)', lineHeight: '1.2', letterSpacing: '-0.01em', color: T }}
                  >
                    {s.title}
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', lineHeight: '1.6', color: M, paddingLeft: 'calc(28px + 16px)' }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════ STATS ═════════════════════════ */}
      <section style={{ borderBottom: `1px solid ${BR}`, padding: '56px 0' }}>
        <div className="px-6 md:px-12 lg:px-20 max-w-[1440px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x" style={{ '--tw-divide-opacity': '1' } as React.CSSProperties}>
            {[
              { value: '200+', label: 'Projects' },
              { value: '80+',  label: 'Clients'  },
              { value: '6+',   label: 'Years'    },
              { value: '12',   label: 'Awards'   },
            ].map(({ value, label }, i) => (
              <div key={label} style={{ padding: i === 0 ? '0 40px 0 0' : '0 40px', borderRight: i < 3 ? `1px solid ${BR}` : 'none' }} className="first:pl-0 last:pr-0">
                <p
                  className="font-black leading-none"
                  style={{ fontSize: 'clamp(2.5rem, 5vw, 6rem)', letterSpacing: '-0.03em', color: L }}
                >
                  {value}
                </p>
                <p style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: M, marginTop: '12px' }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ CONTACT ══════════════════════════ */}
      <section style={{ padding: '96px 0 80px' }}>
        <div className="px-6 md:px-12 lg:px-20 max-w-[1440px] mx-auto">

          <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: M, display: 'block', marginBottom: '40px' }}>
            Let's work together
          </span>

          <h2
            className="font-black leading-[0.87]"
            style={{ fontSize: 'clamp(3rem, 7vw, 9rem)', letterSpacing: '-0.03em', color: T, marginBottom: '64px' }}
          >
            Ready to build<br />
            <span style={{ color: L }}>something?</span>
          </h2>

          {/* Contact details */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-16 items-start" style={{ paddingTop: '40px', borderTop: `1px solid ${BR}`, marginBottom: '48px' }}>
            <div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: M, display: 'block', marginBottom: '10px' }}>Email</span>
              <a
                href={`mailto:${settings.email}`}
                className="hover:text-[#C8FF47] transition-colors duration-200"
                style={{ fontSize: 'clamp(1.25rem, 2vw, 2rem)', fontWeight: 700, lineHeight: '1.2', letterSpacing: '-0.01em', color: T }}
              >
                {settings.email}
              </a>
            </div>
            <div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: M, display: 'block', marginBottom: '10px' }}>Phone</span>
              <a
                href={`tel:${settings.phone.replace(/\s/g, '')}`}
                className="hover:text-[#C8FF47] transition-colors duration-200"
                style={{ fontSize: 'clamp(1.25rem, 2vw, 2rem)', fontWeight: 700, lineHeight: '1.2', letterSpacing: '-0.01em', color: T }}
              >
                {settings.phone}
              </a>
            </div>
            <div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: M, display: 'block', marginBottom: '10px' }}>Address</span>
              <p style={{ fontSize: 'clamp(1.25rem, 2vw, 2rem)', fontWeight: 700, lineHeight: '1.2', letterSpacing: '-0.01em', color: T }}>
                {settings.address}
              </p>
            </div>
          </div>

          {/* Social */}
          <div className="flex flex-wrap gap-8">
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
                className="hover:text-[#C8FF47] transition-colors duration-200"
                style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: M }}
              >
                {label} ↗
              </a>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════ MINIMAL FOOTER ════════════════════ */}
      <footer style={{ borderTop: `1px solid ${BR}`, padding: '24px 0' }}>
        <div
          className="px-6 md:px-12 lg:px-20 max-w-[1440px] mx-auto flex items-center justify-between flex-wrap gap-4"
        >
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: M }}>
            © {new Date().getFullYear()} MAZE Studio. All rights reserved.
          </span>
          <Link
            href="/"
            style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: M }}
            className="hover:text-[#C8FF47] transition-colors duration-200"
          >
            ← Back to main site
          </Link>
        </div>
      </footer>

    </main>
  )
}
