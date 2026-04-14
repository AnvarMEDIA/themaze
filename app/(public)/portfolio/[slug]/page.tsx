import type { Metadata } from 'next'
import { notFound }    from 'next/navigation'
import Image           from 'next/image'
import Link            from 'next/link'
import { getAllProjects, getProjectBySlug } from '@/lib/portfolio'
import { CATEGORY_LABELS } from '@/lib/utils'

interface Props {
  params: { slug: string }
}

export async function generateStaticParams() {
  const projects = getAllProjects()
  return projects.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = getProjectBySlug(params.slug)
  if (!project) return {}
  return {
    title: `${project.title} — ${project.client}`,
    description: project.shortDescription,
    openGraph: {
      title: `${project.title} | MAZE Studio`,
      description: project.shortDescription,
      images: [{ url: project.coverImage }],
    },
  }
}

export default function ProjectPage({ params }: Props) {
  const project = getProjectBySlug(params.slug)
  if (!project) notFound()

  const all     = getAllProjects()
  const related = all.filter(
    (p) => p.id !== project.id && p.category === project.category
  ).slice(0, 2)

  return (
    <article className="pt-28 min-h-screen">
      {/* Hero */}
      <div className="px-6 md:px-10 pb-14 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <Link
            href="/portfolio"
            className="label-sm text-maze-muted hover:text-maze-lime transition-colors mb-8 inline-flex items-center gap-2"
          >
            ← All Work
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-6">
            <div>
              <p className="label-sm text-maze-lime mb-4">
                {CATEGORY_LABELS[project.category]}
              </p>
              <h1 className="display-md text-maze-cream mb-4">{project.title}</h1>
              <p className="heading-md text-maze-muted">{project.client}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 lg:items-end">
              <div>
                <p className="label-sm text-maze-muted mb-1">Year</p>
                <p className="font-semibold text-maze-cream">{project.year}</p>
              </div>
              <div>
                <p className="label-sm text-maze-muted mb-1">Category</p>
                <p className="font-semibold text-maze-cream">{CATEGORY_LABELS[project.category]}</p>
              </div>
              <div>
                <p className="label-sm text-maze-muted mb-2">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {project.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="label-sm px-2 py-0.5 border border-maze-border rounded-full text-maze-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cover image */}
      <div className="w-full aspect-[21/9] relative bg-maze-gray overflow-hidden">
        {project.coverImage && (
          <Image
            src={project.coverImage}
            alt={project.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${project.accentColor}22 0%, #111111 100%)`,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[20vw] font-black opacity-5" style={{ color: project.accentColor }}>
            {project.title.slice(0, 2)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-10 py-20">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-16">
          {/* Description */}
          <div className="lg:col-span-2">
            <h2 className="heading-lg text-maze-cream mb-6">About the project</h2>
            <p className="body-lg text-maze-muted leading-relaxed mb-8">
              {project.description}
            </p>

            {project.results && (
              <div className="p-6 border border-maze-lime/30 rounded-xl bg-maze-lime/5">
                <p className="label-sm text-maze-lime mb-2">Results</p>
                <p className="body-lg text-maze-cream">{project.results}</p>
              </div>
            )}
          </div>

          {/* Services sidebar */}
          <div>
            <div className="sticky top-28">
              <h3 className="label-sm text-maze-muted mb-4">Services delivered</h3>
              <ul className="space-y-3">
                {project.services.map((s) => (
                  <li key={s} className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-maze-lime shrink-0" />
                    <span className="body-lg text-maze-cream">{s}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10 pt-8 border-t border-maze-border">
                <p className="label-sm text-maze-muted mb-4">Like this project?</p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-maze-lime text-maze-black font-bold rounded-full label-sm hover:bg-white transition-colors"
                >
                  Start a similar project ↗
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Gallery */}
        {project.images.length > 0 && (
          <div className="max-w-[1440px] mx-auto mt-20">
            <h3 className="heading-md text-maze-cream mb-8">Gallery</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.images.map((img, i) => (
                <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden bg-maze-gray">
                  <Image
                    src={img}
                    alt={`${project.title} — image ${i + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${project.accentColor}11 0%, #1A1A1A 100%)`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related */}
        {related.length > 0 && (
          <div className="max-w-[1440px] mx-auto mt-24 pt-12 border-t border-maze-border">
            <h3 className="heading-md text-maze-cream mb-8">Related Projects</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {related.map((p) => (
                <Link
                  key={p.id}
                  href={`/portfolio/${p.slug}`}
                  className="group block p-6 rounded-xl border border-maze-border hover:border-maze-lime transition-colors"
                  data-cursor="view"
                >
                  <p className="label-sm text-maze-lime mb-2">{CATEGORY_LABELS[p.category]}</p>
                  <h4 className="heading-md text-maze-cream group-hover:text-maze-lime transition-colors">{p.title}</h4>
                  <p className="label-sm text-maze-muted mt-1">{p.client}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
