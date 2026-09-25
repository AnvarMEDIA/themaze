import { useTranslations } from 'next-intl'
import { ProjectCard } from '@/components/portfolio/ProjectCard'
import type { Project } from '@/lib/types'
import { SectionHead } from './SectionHead'

/**
 * Six projects, drawn on the server once per request (see pickSix in the
 * page) so the HTML and the hydrated page agree on which six. The cards are
 * the portfolio's own, so a project looks the same here as on /portfolio —
 * including its Russian title on /ru, which this section used to skip.
 */
export function FeaturedWork({ projects }: { projects: Project[] }) {
  const t = useTranslations('home.work')
  if (projects.length === 0) return null

  return (
    <section className="px-6 md:px-10 py-12 md:py-16">
      <div className="max-w-[1440px] mx-auto">
        <SectionHead title={t('heading')} link={{ href: '/portfolio', label: t('all') }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-10">
          {projects.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} priority={false} />
          ))}
        </div>
      </div>
    </section>
  )
}
