import type { Post } from '../types'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export default function PostItem({ post }: { post: Post }) {
  const qc = useQueryClient()
  const like = useMutation({
    mutationFn: async () => { await api.post(`/posts/${post.id}/like`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  })
  return (
    <div className="border-b py-3">
      <div className="text-sm text-gray-600">
        <Link to={`/u/${post.user.handle}`}>@{post.user.handle}</Link> · {new Date(post.created_at).toLocaleString()}
      </div>
      <Link to={`/post/${post.id}`} className="block whitespace-pre-wrap">{post.text}</Link>
      <div className="mt-2 flex gap-4 text-sm">
        <button onClick={()=>like.mutate()} className="hover:underline">Like {post.like_count ?? 0}</button>
        <button className="hover:underline">Repost {post.repost_count ?? 0}</button>
        <button className="hover:underline">Reply</button>
      </div>
    </div>
  )
}