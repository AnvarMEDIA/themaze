import { notFound } from 'next/navigation'
import { PostForm } from '@/components/admin/PostForm'
import { getPostById } from '@/lib/posts'

interface Props {
  params: { id: string }
}

export default async function EditInsightPage({ params }: Props) {
  const post = await getPostById(params.id)
  if (!post) notFound()

  return (
    <div className="px-8 py-8">
      <h1 className="text-2xl font-bold text-white tracking-tight mb-6">Edit post</h1>
      <PostForm post={post} />
    </div>
  )
}
