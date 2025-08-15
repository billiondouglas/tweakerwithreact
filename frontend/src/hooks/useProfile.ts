import { useInfiniteQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { CursorPage, Post } from '../types'

export function useProfileFeed(handle: string) {
  return useInfiniteQuery({
    queryKey: ['feed','profile',handle],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<CursorPage<Post>>(`/users/${handle}/posts`, { params: { cursor: pageParam } })
      return data
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined,
    enabled: !!handle,
  })
}