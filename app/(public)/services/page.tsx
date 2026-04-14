import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Services',
  description:
    'MAZE Studio offers brand identity design, brand strategy, UI/UX design, print & packaging, motion design, and art direction for ambitious companies.',
}

const services = [
  {
    id: 'brand-identity',
    num: '01',
    title: 'Brand Identity',
    tagline: 'The complete visual language of your brand.',
    body: `We create comprehensive brand identity systems — the logo, colour palette, typography, imagery style, and iconography that define how your brand looks and feels across every touchpoint. From the first sketch to the final brand guidelines document, we ensure every element works in harmony.`,
    deliverables: [
      'Logo system (primary, secondary, icon)',
      'Colour palette (primary, secondary, neutrals)',
      'Typography system',
      'Iconography & illustration style',
      'Brand guidelines document',
      'Brand asset library',
    ],
    accent: '#C8FF47',
  },
  {
    id: 'strategy',
    num: '02',
    title: 'Brand Strategy',
    tagline: 'The thinking that makes design matter.',
    body: `Before we design anything, we align on strategy. This means understanding your business objectives, audience insights, competitive landscape, and positioning. The output is a strategic brief that becomes the foundation for all creative work — ensuring every design decision has a reason.`,
    deliverables: [
      'Brand audit & competitive analysis',
      'Audience personas',
      'Brand positioning statement',
      'Naming & messaging framework',
      'Brand personality & tone of voice',
      'Strategic brief',
    ],
    accent: '#4B6EF5',
  },
  {
    id: 'ui-ux',
    num: '03',
    title: 'UI / UX Design',
    tagline: 'Digital experiences people love to use.',
    body: `We design digital products — websites, mobile apps, and SaaS platforms — that balance aesthetic quality with functional clarity. Our process starts with user research, moves through wireframing and prototyping, and delivers production-ready UI with a comprehensive design system.`,
    deliverables: [
      'UX research & user flows',
      'Wireframes & prototypes',
      'UI design (all screens/states)',
      'Design system & component library',
      'Responsive & mobile design',
      'Developer handoff (Figma)',
    ],
    accent: '#06D6A0',
  },
  {
    id: 'print',
    num: '04',
    title: 'Print & Packaging',
    tagline: 'Tangible design with lasting impact.',
    body: `Print remains one of the most powerful brand touchpoints. We design stationery systems, packaging, publications, environmental graphics, and campaign materials with the same rigour we apply to digital work — with deep expertise in print production.`,
    deliverables: [
      'Packaging design & dielines',
      'Brand stationery system',
      'Editorial & publication design',
      'Environmental & signage design',
      'Campaign & promotional materials',
      'Print production management',
    ],
    accent: '#FF4D1C',
  },
  {
    id: 'motion',
    num: '05',
    title: 'Motion Design',
    tagline: 'Your brand in motion.',
    body: `We bring brand identities to life through motion — animated logos, brand intro sequences, social media content, UI micro-interactions, and motion guidelines that let your team maintain consistency across video content.`,
    deliverables: [
      'Animated logo',
      'Brand intro / outro sequences',
      'Social media motion templates',
      'UI animations & micro-interactions',
      'Motion brand guidelines',
      'Video production support',
    ],
    accent: '#FF9E00',
  },
  {
    id: 'art-direction',
    num: '06',
    title: 'Art Direction',
    tagline: 'Creative oversight for a unified brand voice.',
    body: `When brands grow, maintaining visual consistency across teams, agencies, and channels becomes the challenge. We provide ongoing art direction — overseeing photography, campaign production, and content creation to keep your brand coherent and compelling.`,
    deliverables: [
      'Photography direction & moodboards',
      'Campaign concepting & direction',
      'Vendor & photographer management',
      'Content strategy & visual guidelines',
      'Ongoing creative consultation',
    ],
    accent: '#B47AEA',
  },
]

export default function ServicesPage() {
  return (
    <div className="pt-28 min-h-screen">
      {/* Header */}
      <div className="px-6 md:px-10 py-20 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <p className="label-sm text-maze-muted mb-6">What we offer</p>
          <h1 className="display-md text-maze-cream max-w-2xl mb-8">
            Services built for ambitious brands.
          </h1>
          <p className="body-lg text-maze-muted max-w-xl">
            From brand strategy to motion design — we offer the full creative suite
            that growing brands need to compete and win.
          </p>
        </div>
      </div>

      {/* Services */}
      <div className="px-6 md:px-10">
        <div className="max-w-[1440px] mx-auto">
          {services.map((service, i) => (
            <div
              key={service.id}
              id={service.id}
              className="py-16 md:py-24 border-b border-maze-border grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24"
            >
              {/* Left */}
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <span
                    className="label-sm font-bold"
                    style={{ color: service.accent }}
                  >
                    {service.num}
                  </span>
                  <div className="h-px flex-1" style={{ background: service.accent + '33' }} />
                </div>
                <h2 className="heading-lg text-maze-cream mb-3">{service.title}</h2>
                <p
                  className="heading-md mb-6"
                  style={{ color: service.accent }}
                >
                  {service.tagline}
                </p>
                <p className="body-lg text-maze-muted">{service.body}</p>
              </div>

              {/* Right */}
              <div>
                <p className="label-sm text-maze-muted mb-5">What you get</p>
                <ul className="space-y-3">
                  {service.deliverables.map((d) => (
                    <li key={d} className="flex items-center gap-3">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: service.accent }}
                      />
                      <span className="body-lg text-maze-cream">{d}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-10">
                  <Link
                    href={`/contact?service=${service.id}`}
                    className="inline-flex items-center gap-2 label-sm px-5 py-3 border border-maze-border rounded-full text-maze-muted hover:border-maze-lime hover:text-maze-lime transition-all duration-300"
                  >
                    Enquire about {service.title} →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 md:px-10 py-24 text-center">
        <p className="label-sm text-maze-muted mb-4">Not sure what you need?</p>
        <h2 className="display-md text-maze-cream mb-6">Let's talk.</h2>
        <p className="body-lg text-maze-muted max-w-md mx-auto mb-8">
          Tell us about your challenge and we'll recommend the right engagement model.
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-3 px-8 py-4 bg-maze-lime text-maze-black font-bold rounded-full hover:bg-white transition-colors"
        >
          Book a discovery call ↗
        </Link>
      </div>
    </div>
  )
}
