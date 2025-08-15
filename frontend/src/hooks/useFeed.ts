import { useInfiniteQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { CursorPage, Post } from '../types'

export function useGlobalFeed() {
  return useInfiniteQuery({
    queryKey: ['feed','global'],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<CursorPage<Post>>('/feed/global', { params: { cursor: pageParam } })
      return data
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined,
  })
}