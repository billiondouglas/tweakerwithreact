import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export default function PostComposer() {
  const [text, setText] = useState('')
  const max = 280
  const left = max - text.length
  const qc = useQueryClient()

  const create = useMutation({
    mutationFn: async () => (await api.post('/posts', { text })).data,
    onSuccess: () => { setText(''); qc.invalidateQueries({ queryKey: ['feed','global'] }) },
  })

  return (
    <div className="rounded-xl border p-3 bg-white">
      <textarea
        value={text}
        onChange={e=>setText(e.target.value.slice(0,max))}
        placeholder="Say something?"
        className="w-full resize-none outline-none min-h-[80px]"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className={`text-sm ${left<=20?'text-red-600':'text-gray-500'}`}>{left}</span>
        <button
          onClick={()=>create.mutate()}
          disabled={!text.trim() || create.isPending}
          className="px-3 py-1 rounded-lg bg-black text-white disabled:opacity-50"
        >Post</button>
      </div>
    </div>
  )
}