import PostComposer from '../components/PostComposer'
import FeedList from '../components/FeedList'
import { useGlobalFeed } from '../hooks/useFeed'

export default function Feed() {
  const q = useGlobalFeed()
  return (
    <div className="max-w-xl mx-auto p-3 space-y-4">
      <PostComposer />
      {q.status==='pending' && <div>Loading…</div>}
      {q.status==='error' && <div>Failed to load</div>}
      {q.status==='success' && (
        <FeedList
          pages={q.data.pages}
          fetchNextPage={q.fetchNextPage}
          hasNextPage={q.hasNextPage}
          isFetchingNextPage={q.isFetchingNextPage}
        />
      )}
    </div>
  )
}