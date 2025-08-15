import { useParams } from 'react-router-dom'
import { usePost } from '../hooks/usePost'
import PostItem from '../components/PostItem'

export default function Post() {
  const { id = '' } = useParams()
  const q = usePost(id)
  if (q.status==='pending') return <div className="p-3">Loading…</div>
  if (q.status==='error' || !q.data) return <div className="p-3">Not found</div>
  return <div className="max-w-xl mx-auto p-3"><PostItem post={q.data} /></div>
}