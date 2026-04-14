import type { Metadata } from 'next'
import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid'
import { getAllProjects } from '@/lib/portfolio'

export const metadata: Metadata = {
  title: 'Portfolio — Our Work',
  description:
    'Explore MAZE Studio\'s portfolio of brand identity, UI/UX design, print, and motion design projects across Uzbekistan and Central Asia.',
}

export default function PortfolioPage() {
  const projects = getAllProjects()

  return (
    <div className="pt-28 pb-20 px-6 md:px-10 min-h-screen">
      <div className="max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="mb-16 border-b border-maze-border pb-10">
          <p className="label-sm text-maze-muted mb-4">Our Work</p>
          <h1 className="display-md text-maze-cream">Portfolio</h1>
        </div>

        <PortfolioGrid projects={projects} />
      </div>
    </div>
  )
}
