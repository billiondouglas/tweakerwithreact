import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { Post } from '../types'

export function usePost(id: string) {
  return useQuery({
    queryKey: ['post', id],
    queryFn: async () => (await api.get<Post>(`/posts/${id}`)).data,
    enabled: !!id,
  })
}