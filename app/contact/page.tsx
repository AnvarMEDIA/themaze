import type { Metadata } from 'next'
import { ContactForm } from '@/components/contact/ContactForm'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with MAZE Studio. Start a branding project, ask a question, or book a discovery call.',
}

const info = [
  { label: 'Email',    value: 'hello@maze.uz',   href: 'mailto:hello@maze.uz' },
  { label: 'Phone',    value: '+998 99 999 99 99', href: 'tel:+998999999999' },
  { label: 'Telegram', value: '@mazestudio',       href: 'https://t.me/mazestudio' },
  { label: 'Location', value: 'Tashkent, Uzbekistan', href: null },
]

const socials = [
  { label: 'Instagram', href: 'https://instagram.com/mazestudio' },
  { label: 'Behance',   href: 'https://behance.net/mazestudio' },
  { label: 'LinkedIn',  href: 'https://linkedin.com/company/mazestudio' },
  { label: 'Dribbble',  href: 'https://dribbble.com/mazestudio' },
]

export default function ContactPage() {
  return (
    <div className="pt-28 min-h-screen">
      {/* Header */}
      <div className="px-6 md:px-10 py-16 md:py-24 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <p className="label-sm text-maze-muted mb-6">Get in touch</p>
          <h1 className="display-md text-maze-cream max-w-2xl">
            Let's build something great together.
          </h1>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 md:px-10 py-16 md:py-24">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Left — info */}
          <div>
            <p className="body-lg text-maze-muted mb-10 max-w-md">
              Whether you have a clear brief or just an idea, we'd love to hear from you.
              Fill in the form and we'll respond within 24 hours.
            </p>

            {/* Contact details */}
            <div className="space-y-6 mb-12">
              {info.map((item) => (
                <div key={item.label}>
                  <p className="label-sm text-maze-muted mb-1">{item.label}</p>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="body-lg text-maze-cream hover:text-maze-lime transition-colors"
                      target={item.href.startsWith('http') ? '_blank' : undefined}
                      rel="noopener noreferrer"
                    >
                      {item.value}
                    </a>
                  ) : (
                    <p className="body-lg text-maze-cream">{item.value}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Socials */}
            <div>
              <p className="label-sm text-maze-muted mb-4">Follow us</p>
              <div className="flex gap-4">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label-sm px-4 py-2 border border-maze-border rounded-full text-maze-muted hover:border-maze-lime hover:text-maze-lime transition-all duration-200"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right — form */}
          <div>
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  )
}
