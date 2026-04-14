import Link from 'next/link'
import { getAllProjects } from '@/lib/portfolio'
import { AdminNav }      from '@/components/admin/AdminNav'
import { CATEGORY_LABELS } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default function AdminPage() {
  const projects = getAllProjects()
  const featured = projects.filter((p) => p.featured).length

  return (
    <>
      <AdminNav />
      <div className="pt-20 px-6 md:px-10 py-10 min-h-screen bg-maze-black">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h1 className="heading-lg text-maze-cream">Portfolio</h1>
              <p className="body-lg text-maze-muted mt-1">
                {projects.length} projects · {featured} featured
              </p>
            </div>
            <Link
              href="/admin/new"
              className="px-5 py-2.5 bg-maze-lime text-maze-black font-bold rounded-full label-sm hover:bg-white transition-colors"
            >
              + New project
            </Link>
          </div>

          {/* Projects table */}
          {projects.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-maze-border rounded-xl">
              <p className="body-lg text-maze-muted mb-4">No projects yet.</p>
              <Link
                href="/admin/new"
                className="label-sm text-maze-lime hover:underline"
              >
                Add your first project →
              </Link>
            </div>
          ) : (
            <div className="border border-maze-border rounded-xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 bg-maze-dark border-b border-maze-border">
                <span className="label-sm text-maze-muted">Project</span>
                <span className="label-sm text-maze-muted">Category</span>
                <span className="label-sm text-maze-muted">Year</span>
                <span className="label-sm text-maze-muted">Featured</span>
                <span className="label-sm text-maze-muted">Actions</span>
              </div>

              {/* Rows */}
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-4 border-b border-maze-border last:border-b-0 hover:bg-maze-dark transition-colors"
                >
                  <div>
                    <p className="font-semibold text-maze-cream">{project.title}</p>
                    <p className="label-sm text-maze-muted mt-0.5">{project.client}</p>
                  </div>
                  <span className="label-sm px-2.5 py-1 border border-maze-border rounded-full text-maze-muted whitespace-nowrap">
                    {CATEGORY_LABELS[project.category]}
                  </span>
                  <span className="label-sm text-maze-muted">{project.year}</span>
                  <span className={`w-2 h-2 rounded-full mx-auto ${project.featured ? 'bg-maze-lime' : 'bg-maze-border'}`} />
                  <div className="flex gap-3">
                    <Link
                      href={`/admin/edit/${project.id}`}
                      className="label-sm text-maze-muted hover:text-maze-lime transition-colors"
                    >
                      Edit
                    </Link>
                    <DeleteButton id={project.id} title={project.title} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tips */}
          <div className="mt-10 p-6 border border-maze-border rounded-xl bg-maze-dark">
            <p className="label-sm text-maze-lime mb-3">Tips</p>
            <ul className="space-y-2 body-lg text-maze-muted">
              <li>• Upload images via the New/Edit project form (drag & drop supported)</li>
              <li>• For production on Vercel: set ADMIN_PASSWORD and JWT_SECRET env vars</li>
              <li>• Images are stored in <code className="text-maze-cream">/public/portfolio/uploads/</code></li>
              <li>• After uploading via admin, commit & push to deploy to Vercel</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}

function DeleteButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={async () => {
        'use server'
        const { deleteProject } = await import('@/lib/portfolio')
        deleteProject(id)
      }}
    >
      <button
        type="submit"
        className="label-sm text-maze-muted hover:text-red-400 transition-colors"
        onClick={(e) => {
          if (!confirm(`Delete "${title}"? This cannot be undone.`)) {
            e.preventDefault()
          }
        }}
      >
        Delete
      </button>
    </form>
  )
}
