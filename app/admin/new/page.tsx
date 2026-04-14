import { AdminNav }     from '@/components/admin/AdminNav'
import { ProjectForm } from '@/components/admin/ProjectForm'

export const dynamic = 'force-dynamic'

export default function NewProjectPage() {
  return (
    <>
      <AdminNav />
      <div className="pt-20 px-6 md:px-10 py-10 min-h-screen bg-maze-black">
        <div className="max-w-3xl mx-auto">
          <h1 className="heading-lg text-maze-cream mb-8">New Project</h1>
          <ProjectForm />
        </div>
      </div>
    </>
  )
}
