import { useParams } from 'react-router-dom'
import { useProfileFeed } from '../hooks/useProfile'
import TweetFeed from '../components/TweetFeed'

export default function Profile() {
  const { handle = '' } = useParams()
  const q = useProfileFeed(handle)
  return (
    <div className="max-w-xl mx-auto p-3">
      <h1 className="text-xl font-semibold mb-3">@{handle}</h1>
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