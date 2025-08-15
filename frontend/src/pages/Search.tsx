import { useState } from 'react'
import { api } from '../api/client'
import { Post } from '../types'
import PostItem from '../components/PostItem'

export default function Search() {
  const [q,setQ] = useState(''); const [items,setItems] = useState<Post[]>([]); const [loading,setLoading] = useState(false)
  const run = async ()=>{
    setLoading(true)
    try { const { data } = await api.get<{ items: Post[] }>('/search', { params: { q } }); setItems(data.items) }
    finally { setLoading(false) }
  }
  return (
    <div className="max-w-xl mx-auto p-3">
      <div className="flex gap-2">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search posts or #tags" className="flex-1 border rounded px-3 py-2"/>
        <button onClick={run} className="px-3 py-2 rounded bg-black text-white">Search</button>
      </div>
      <div className="mt-4">{loading?'Searching…':items.map(p=><PostItem key={p.id} post={p}/>)}</div>
    </div>
  )
}