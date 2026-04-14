import { notFound }    from 'next/navigation'
import { AdminNav }    from '@/components/admin/AdminNav'
import { ProjectForm } from '@/components/admin/ProjectForm'
import { getProjectById } from '@/lib/portfolio'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
}

export default function EditProjectPage({ params }: Props) {
  const project = getProjectById(params.id)
  if (!project) notFound()

  return (
    <>
      <AdminNav />
      <div className="pt-20 px-6 md:px-10 py-10 min-h-screen bg-maze-black">
        <div className="max-w-3xl mx-auto">
          <h1 className="heading-lg text-maze-cream mb-2">Edit Project</h1>
          <p className="body-lg text-maze-muted mb-8">{project.title}</p>
          <ProjectForm project={project} />
        </div>
      </div>
    </>
  )
}
