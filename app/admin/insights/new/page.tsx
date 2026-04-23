import { PostForm } from '@/components/admin/PostForm'

export default function NewInsightPage() {
  return (
    <div className="px-8 py-8">
      <h1 className="text-2xl font-bold text-white tracking-tight mb-6">New post</h1>
      <PostForm />
    </div>
  )
}
