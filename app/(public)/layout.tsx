import { Navbar }       from '@/components/layout/Navbar'
import { Footer }       from '@/components/layout/Footer'
import { CustomCursor } from '@/components/layout/CustomCursor'
import { SmoothScroll } from '@/components/layout/SmoothScroll'
import { Toaster }      from 'react-hot-toast'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'MAZE Studio',
  description: 'Premium branding and design studio based in Tashkent, Uzbekistan',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz',
  logo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz'}/logo.svg`,
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Toshkent',
    addressLocality: 'Tashkent',
    addressCountry: 'UZ',
  },
  contactPoint: { '@type': 'ContactPoint', email: 'hello@maze.uz', contactType: 'customer service' },
  sameAs: [
    'https://instagram.com/mazestudio',
    'https://behance.net/mazestudio',
    'https://linkedin.com/company/mazestudio',
  ],
  priceRange: '$$$',
  serviceType: ['Brand Identity Design', 'Logo Design', 'UI/UX Design', 'Brand Strategy', 'Print Design', 'Motion Design'],
}

/** Public site layout — includes all visual chrome and animation libs. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SmoothScroll>
        <div className="noise">
          <CustomCursor />
          <Navbar />
          <main>{children}</main>
          <Footer />
        </div>
      </SmoothScroll>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1E1E1E',
            color: '#EDEBE3',
            border: '1px solid #252525',
            fontFamily: 'var(--font-space)',
          },
        }}
      />
    </>
  )
}
