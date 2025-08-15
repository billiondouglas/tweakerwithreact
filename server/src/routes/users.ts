import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

// GET /users/:handle/posts?cursor=
router.get('/:handle/posts', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { handle: req.params.handle } })
  if (!user) return res.json({ items: [], nextCursor: null })

  const take = 20
  const cursor = (req.query.cursor as string | undefined) ?? undefined
  let where: any = { userId: user.id }
  if (cursor) {
    const [ts, id] = cursor.split('|')
    where = { AND: [ where, { OR: [{ createdAt: { lt: new Date(ts) } }, { createdAt: new Date(ts), id: { lt: id } }] } ] }
  }

  const items = await prisma.post.findMany({
    where, take, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: { user: true, _count: { select: { likes: true, reposts: true } } }
  })
  const next = items.length === take
    ? `${items[items.length-1].createdAt.toISOString()}|${items[items.length-1].id}`
    : null

  res.json({
    items: items.map(p => ({
      id: p.id,
      text: p.text,
      created_at: p.createdAt,
      parent_post_id: p.parentPostId,
      user: { id: p.userId, handle: p.user.handle },
      like_count: p._count.likes,
      repost_count: p._count.reposts
    })),
    nextCursor: next
  })
})

export default router