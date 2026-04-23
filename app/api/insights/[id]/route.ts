import { NextRequest, NextResponse } from 'next/server'
import { updatePost, deletePost, softDeletePost, restorePost } from '@/lib/posts'
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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const hard = new URL(req.url).searchParams.get('hard') === '1'
  if (hard) {
    const removed = await deletePost(params.id)
    if (!removed) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    revalidatePath('/', 'layout')
    return NextResponse.json({ ok: true, hard: true })
  }

  const post = await softDeletePost(params.id)
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true, deletedAt: post.deletedAt })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const action = new URL(req.url).searchParams.get('action')
  if (action !== 'restore') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
  const post = await restorePost(params.id)
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  revalidatePath('/', 'layout')
  return NextResponse.json(post)
}
