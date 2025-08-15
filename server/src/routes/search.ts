import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

// GET /search?q=
router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase()
  if (!q) return res.json({ items: [] })

  // tag search if starts with '#'
  if (q.startsWith('#')) {
    const tag = await prisma.tag.findUnique({ where: { tag: q.slice(1) } })
    if (!tag) return res.json({ items: [] })
    const links = await prisma.postTag.findMany({
      where: { tagId: tag.id },
      take: 50,
      orderBy: { post: { createdAt: 'desc' } },
      include: { post: { include: { user: true, _count: { select: { likes: true, reposts: true } } } } }
    })
    return res.json({
      items: links.map(l => ({
        id: l.post.id,
        text: l.post.text,
        created_at: l.post.createdAt,
        parent_post_id: l.post.parentPostId,
        user: { id: l.post.userId, handle: l.post.user.handle },
        like_count: l.post._count.likes,
        repost_count: l.post._count.reposts
      }))
    })
  }

  // simple text contains search
  const posts = await prisma.post.findMany({
    where: { text: { contains: q, mode: 'insensitive' } },
    take: 50,
    orderBy: [{ createdAt: 'desc' }]
  })
  const withUsers = await prisma.post.findMany({
    where: { id: { in: posts.map(p => p.id) } },
    include: { user: true, _count: { select: { likes: true, reposts: true } } }
  })
  res.json({
    items: withUsers.map(p => ({
      id: p.id,
      text: p.text,
      created_at: p.createdAt,
      parent_post_id: p.parentPostId,
      user: { id: p.userId, handle: p.user.handle },
      like_count: p._count.likes,
      repost_count: p._count.reposts
    }))
  })
})

export default router