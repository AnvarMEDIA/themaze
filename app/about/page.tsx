import type { Metadata } from 'next'
import Link from 'next/link'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about MAZE Studio — a branding and design studio based in Tashkent, Uzbekistan, crafting bold visual identities since 2017.',
}

const team = [
  {
    name: 'Anvar Yusupov',
    role: 'Founder & Creative Director',
    bio:  'Leads the studio\'s creative vision with 10+ years across branding, typography, and art direction.',
  },
  {
    name: 'Dilnoza Rashidova',
    role: 'Head of Strategy',
    bio:  'Brand strategist who bridges business objectives and creative execution for measurable impact.',
  },
  {
    name: 'Bobur Mirzaev',
    role: 'Lead UI/UX Designer',
    bio:  'Designs intuitive digital experiences with deep expertise in design systems and user research.',
  },
  {
    name: 'Malika Toshmatova',
    role: 'Senior Graphic Designer',
    bio:  'Specialises in print, packaging, and environmental design with an eye for editorial craft.',
  },
]

const values = [
  {
    title: 'Clarity from complexity',
    body:  'Like a well-designed maze, we create clear paths through complex brand challenges.',
  },
  {
    title: 'Strategy before aesthetics',
    body:  'Beautiful design that doesn\'t solve a problem is just decoration. We think first.',
  },
  {
    title: 'Craft in every detail',
    body:  'The kerning, the colour choice, the paper stock — every detail earns its place.',
  },
  {
    title: 'Partnership over projects',
    body:  'We build long-term relationships. Your brand\'s evolution is our ongoing commitment.',
  },
]

const clients = [
  'Hilol', 'UzPay', 'Samarkand Heritage', 'Palov House',
  'TechUZ', 'Anor Winery', 'UzAir', 'Asaka Motors',
  'Tashkent University', 'Silk Road Hotels', 'Green Energy UZ', 'Moliya Bank',
]

export default function AboutPage() {
  return (
    <div className="pt-28">
      {/* Hero */}
      <div className="px-6 md:px-10 py-20 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <p className="label-sm text-maze-muted mb-6">About us</p>
          <h1 className="display-md text-maze-cream max-w-3xl mb-8">
            We navigate brands through complexity to clarity.
          </h1>
          <p className="body-lg text-maze-muted max-w-2xl">
            MAZE is a branding and design studio based in Tashkent, Uzbekistan.
            Since 2017, we've built bold visual identities for startups, enterprises,
            and cultural institutions across Central Asia and beyond.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 md:px-10 py-16 border-b border-maze-border bg-maze-dark">
        <div className="max-w-[1440px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { end: 7,   suffix: '+', label: 'Years' },
            { end: 200, suffix: '+', label: 'Projects' },
            { end: 80,  suffix: '+', label: 'Clients' },
            { end: 12,  suffix: '',  label: 'Awards' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="display-md text-maze-lime font-black">
                <AnimatedCounter end={s.end} suffix={s.suffix} />
              </div>
              <p className="label-sm text-maze-muted mt-2">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Story */}
      <div className="px-6 md:px-10 py-20 md:py-32 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <h2 className="heading-lg text-maze-cream mb-6">Our Story</h2>
            <div className="space-y-5 body-lg text-maze-muted">
              <p>
                MAZE was founded in Tashkent in 2017 with a simple conviction: that Central Asian
                brands deserve world-class design. At the time, the region's design landscape was
                largely derivative — copying Western trends without strategic intent.
              </p>
              <p>
                We built MAZE to be different. From day one, we insisted on strategy before
                aesthetics, on understanding a business deeply before picking up a pen. This approach
                won us early trust from Uzbekistan's most ambitious companies.
              </p>
              <p>
                Today, our work reaches millions of people daily — on product labels, apps, storefronts,
                and city billboards. We remain a tight-knit studio by choice: small enough to care
                deeply, experienced enough to deliver at scale.
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {/* Values */}
            <h2 className="heading-lg text-maze-cream mb-6">Our Values</h2>
            {values.map((v, i) => (
              <div key={i} className="p-5 border border-maze-border rounded-xl hover:border-maze-lime transition-colors group">
                <h3 className="font-semibold text-maze-cream group-hover:text-maze-lime transition-colors mb-1.5">
                  {v.title}
                </h3>
                <p className="body-lg text-maze-muted">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="px-6 md:px-10 py-20 md:py-32 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <h2 className="heading-lg text-maze-cream mb-12">The Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member) => (
              <div key={member.name} className="group">
                {/* Avatar placeholder */}
                <div className="aspect-square rounded-xl bg-maze-dark border border-maze-border mb-5 flex items-center justify-center group-hover:border-maze-lime transition-colors overflow-hidden">
                  <span className="text-4xl font-black text-maze-muted">
                    {member.name.slice(0, 2)}
                  </span>
                </div>
                <h3 className="font-semibold text-maze-cream">{member.name}</h3>
                <p className="label-sm text-maze-lime mt-0.5 mb-2">{member.role}</p>
                <p className="body-lg text-maze-muted">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clients */}
      <div className="px-6 md:px-10 py-20 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <p className="label-sm text-maze-muted mb-8">Trusted by</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {clients.map((client) => (
              <div
                key={client}
                className="h-14 flex items-center justify-center border border-maze-border rounded-lg text-maze-muted label-sm hover:border-maze-lime hover:text-maze-cream transition-all duration-200"
              >
                {client}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 md:px-10 py-20 text-center">
        <h2 className="display-md text-maze-cream mb-6">Ready to work together?</h2>
        <Link
          href="/contact"
          className="inline-flex items-center gap-3 px-8 py-4 bg-maze-lime text-maze-black font-bold rounded-full hover:bg-white transition-colors"
        >
          Start a project ↗
        </Link>
      </div>
    </div>
  )
}
