import { NextRequest, NextResponse } from 'next/server'
import { getAllPosts, createPost } from '@/lib/posts'
import { getAdminSession } from '@/lib/auth'
import { PostSchema } from '@/lib/validation'
import { slugify } from '@/lib/utils'
import { revalidatePath } from 'next/cache'
import { notifyIndexNow, localePair } from '@/lib/indexing'

export const dynamic = 'force-dynamic'

export async function GET() {
  const posts = await getAllPosts()
  return NextResponse.json(posts)
}

export async function POST(req: NextRequest) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const parsed = PostSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
    }
    const data = parsed.data
    const post = await createPost({
      ...data,
      slug: data.slug || slugify(data.title),
    })
    revalidatePath('/', 'layout')
    if (post.status === 'published') {
      void notifyIndexNow([
        ...localePair(`insights/${post.slug}`),
        ...localePair('insights'),
      ])
    }
    return NextResponse.json(post, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
