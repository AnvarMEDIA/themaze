import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProjectById } from '@/lib/portfolio'
import { buildPressKit } from '@/lib/pressKit'
import { PressKitInteractive } from '@/components/admin/PressKitInteractive'

interface Props {
  params: { id: string }
}

export default async function PressKitPage({ params }: Props) {
  const project = await getProjectById(params.id)
  if (!project) notFound()
  const kit = buildPressKit(project)

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <Link
            href="/admin/projects"
            className="text-xs text-[#555] hover:text-white transition-colors mb-3 inline-block"
          >
            ← Projects
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">Press kit — {project.title}</h1>
          <p className="text-sm text-[#555] mt-1">
            Ready-to-paste captions, share buttons and direct submit links for every place a case
            should live. Search engines are pinged automatically on publish; this is for the manual
            distribution that drives links and traffic.
          </p>
        </div>
        <a
          href={kit.publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-4 py-2.5 bg-[#C8FF47] text-[#0A0A0A] font-bold rounded-lg text-sm hover:bg-[#F0EEE6] transition-colors"
        >
          View public page ↗
        </a>
      </div>

      <PressKitInteractive kit={kit} />
    </div>
  )
}
