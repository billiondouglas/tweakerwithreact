export type User = { id: string; handle: string }

export type Post = {
  id: string
  user: User
  text: string
  created_at: string
  parent_post_id?: string | null
  like_count?: number
  repost_count?: number
}

export type CursorPage<T> = { items: T[]; nextCursor?: string | null }