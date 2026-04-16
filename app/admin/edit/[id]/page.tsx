import { notFound }    from 'next/navigation'
import { ProjectForm } from '@/components/admin/ProjectForm'
import { getProjectById } from '@/lib/portfolio'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
}

export default async function EditProjectPage({ params }: Props) {
  const project = await getProjectById(params.id)
  if (!project) notFound()

  return (
    <div className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Edit Project</h1>
        <p className="text-sm text-[#555] mt-1">{project.title}</p>
      </div>
      <ProjectForm project={project} />
    </div>
  )
}
