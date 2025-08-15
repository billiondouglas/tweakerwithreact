import { useRef, useEffect } from 'react'
import PostItem from './PostItem'
import type { Post } from '../types'

export default function FeedList({ pages, fetchNextPage, hasNextPage, isFetchingNextPage }:{
  pages: { items: Post[] }[]; fetchNextPage: ()=>void; hasNextPage?: boolean; isFetchingNextPage: boolean
}) {
  const sentinel = useRef<HTMLDivElement | null>(null)
  useEffect(()=>{
    const el = sentinel.current
    if(!el) return
    const io = new IntersectionObserver(([e])=>{
      if(e.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
    })
    io.observe(el); return ()=>io.disconnect()
  },[hasNextPage,isFetchingNextPage,fetchNextPage])

  return (
    <div>
      {pages.flatMap(p=>p.items).map(p=>(<PostItem key={p.id} post={p}/>))}
      <div ref={sentinel} className="py-6 text-center text-gray-500">{isFetchingNextPage?'Loading…':hasNextPage?'':'No more'}</div>
    </div>
  )
}