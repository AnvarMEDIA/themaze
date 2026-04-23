import { NextRequest, NextResponse } from 'next/server'
import { updatePost, deletePost } from '@/lib/posts'
import { getAdminSession } from '@/lib/auth'
import { PostUpdateSchema } from '@/lib/validation'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const parsed = PostUpdateSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
    }
    const post = await updatePost(params.id, parsed.data)
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    revalidatePath('/', 'layout')
    return NextResponse.json(post)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const removed = await deletePost(params.id)
  if (!removed) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true })
}
