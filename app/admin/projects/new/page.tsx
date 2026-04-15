import { ProjectForm } from '@/components/admin/ProjectForm'

export default function NewProjectPage() {
  return (
    <div className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">New Project</h1>
        <p className="text-sm text-[#555] mt-1">Add a new project to the portfolio.</p>
      </div>
      <ProjectForm />
    </div>
  )
}
