import { redirect } from 'next/navigation'

// Redirect legacy /admin/new → /admin/projects/new
export default function LegacyNewPage() {
  redirect('/admin/projects/new')
}
