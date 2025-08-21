import TweetBox from '../components/TweetBox'
import TweetFeed from '../components/TweetFeed'
import { useGlobalFeed } from '../hooks/useFeed'

export default function Feed() {
  const q = useGlobalFeed()
  return (
    <div className="max-w-xl mx-auto p-3 space-y-4">
      <TweetBox />
      {q.status==='pending' && <div>Loading…</div>}
      {q.status==='error' && <div>Failed to load</div>}
      {q.status==='success' && (
        <TweetFeed
          pages={q.data.pages}
          fetchNextPage={q.fetchNextPage}
          hasNextPage={q.hasNextPage}
          isFetchingNextPage={q.isFetchingNextPage}
        />
      )}
    </div>
  )
}