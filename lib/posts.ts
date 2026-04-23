import { v4 as uuidv4 } from 'uuid'
import readingTime from 'reading-time'
import { readStore, writeStore } from './store'

export interface Post {
  id:            string
  slug:          string
  title:         string
  titleRu:       string
  excerpt:       string
  excerptRu:     string
  body:          string   // Markdown
  bodyRu:        string   // Markdown
  coverImage:    string
  author:        string
  tags:          string[]
  status:        'draft' | 'published'
  publishedAt:   string   // ISO
  createdAt:     string
  updatedAt:     string
}

export type PostInput = Omit<Post, 'id' | 'createdAt' | 'updatedAt'>

interface PostData {
  posts: Post[]
}

async function readData(): Promise<PostData> {
  return readStore<PostData>('posts', { posts: [] })
}
async function writeData(data: PostData): Promise<void> {
  return writeStore('posts', data)
}

export async function getAllPosts(): Promise<Post[]> {
  const { posts } = await readData()
  return [...posts].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )
}

export async function getPublishedPosts(): Promise<Post[]> {
  const all = await getAllPosts()
  return all.filter((p) => p.status === 'published')
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const all = await getAllPosts()
  return all.find((p) => p.slug === slug) ?? null
}

export async function getPostById(id: string): Promise<Post | null> {
  const all = await getAllPosts()
  return all.find((p) => p.id === id) ?? null
}

export async function createPost(input: PostInput): Promise<Post> {
  const data = await readData()
  const now  = new Date().toISOString()
  const post: Post = { ...input, id: uuidv4(), createdAt: now, updatedAt: now }
  data.posts.push(post)
  await writeData(data)
  return post
}

export async function updatePost(id: string, input: Partial<PostInput>): Promise<Post | null> {
  const data = await readData()
  const idx  = data.posts.findIndex((p) => p.id === id)
  if (idx === -1) return null
  data.posts[idx] = { ...data.posts[idx], ...input, updatedAt: new Date().toISOString() }
  await writeData(data)
  return data.posts[idx]
}

export async function deletePost(id: string): Promise<boolean> {
  const data    = await readData()
  const before  = data.posts.length
  data.posts    = data.posts.filter((p) => p.id !== id)
  if (data.posts.length === before) return false
  await writeData(data)
  return true
}

export function estimateReadTime(body: string): { minutes: number; words: number } {
  const stats = readingTime(body ?? '')
  return { minutes: Math.max(1, Math.round(stats.minutes)), words: stats.words }
}
