import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import { authRequired } from '../lib/auth.js'

const router = Router()

// helper: explode #tags
function extractTags(text: string) {
  const tags = new Set<string>()
  text.replace(/(^|\s)#([a-zA-Z0-9_]{1,30})/g, (_, _a, t) => { tags.add(t.toLowerCase()); return '' })
  return [...tags]
}

// POST /posts { text, parentId? }
router.post('/', authRequired, async (req, res) => {
  const { text, parentId } = z.object({
    text: z.string().min(1).max(280),
    parentId: z.string().optional()
  }).parse(req.body)
  const u = (req as any).user as { uid: string }
  const post = await prisma.post.create({ data: { text, userId: u.uid, parentPostId: parentId ?? null } })

  // tags
  const tags = extractTags(text)
  for (const t of tags) {
    const tag = await prisma.tag.upsert({ where: { tag: t }, update: {}, create: { tag: t } })
    await prisma.postTag.create({ data: { postId: post.id, tagId: tag.id } })
  }
  res.json(post)
})

// GET /feed/global?cursor=<iso>|<id>
router.get('/feed/global', async (req, res) => {
  const cursor = (req.query.cursor as string | undefined) ?? undefined
  const take = 20

  // cursor is createdAt|id
  let where = {}
  let orderBy = [{ createdAt: 'desc' as const }, { id: 'desc' as const }]
  if (cursor) {
    const [ts, id] = cursor.split('|')
    where = { OR: [{ createdAt: { lt: new Date(ts) } }, { createdAt: new Date(ts), id: { lt: id } }] }
  }

  const items = await prisma.post.findMany({
    where,
    orderBy,
    take,
    include: {
      user: true,
      _count: { select: { likes: true, reposts: true } }
    }
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
      user: { id: p.userId, handle: (p as any).user.handle },
      like_count: (p as any)._count.likes,
      repost_count: (p as any)._count.reposts
    })),
    nextCursor: next
  })
})

// GET /posts/:id
router.get('/:id', async (req, res) => {
  const p = await prisma.post.findUnique({
    where: { id: req.params.id },
    include: { user: true, _count: { select: { likes: true, reposts: true } } }
  })
  if (!p) return res.status(404).json({ error: 'not_found' })
  res.json({
    id: p.id,
    text: p.text,
    created_at: p.createdAt,
    parent_post_id: p.parentPostId,
    user: { id: p.userId, handle: p.user.handle },
    like_count: p._count.likes,
    repost_count: p._count.reposts
  })
})

// POST /posts/:id/like
router.post('/:id/like', authRequired, async (req, res) => {
  const u = (req as any).user as { uid: string }
  try {
    await prisma.postLike.create({ data: { postId: req.params.id, userId: u.uid } })
  } catch {}
  res.json({ ok: true })
})

// DELETE /posts/:id/like
router.delete('/:id/like', authRequired, async (req, res) => {
  const u = (req as any).user as { uid: string }
  await prisma.postLike.deleteMany({ where: { postId: req.params.id, userId: u.uid } })
  res.json({ ok: true })
})

// POST /posts/:id/repost
router.post('/:id/repost', authRequired, async (req, res) => {
  const u = (req as any).user as { uid: string }
  try {
    await prisma.repost.create({ data: { postId: req.params.id, userId: u.uid } })
  } catch {}
  res.json({ ok: true })
})

// DELETE /posts/:id/repost
router.delete('/:id/repost', authRequired, async (req, res) => {
  const u = (req as any).user as { uid: string }
  await prisma.repost.deleteMany({ where: { postId: req.params.id, userId: u.uid } })
  res.json({ ok: true })
})

// POST /posts/:id/report { reason }
router.post('/:id/report', async (req, res) => {
  const { reason } = z.object({ reason: z.string().min(1).max(200) }).parse(req.body)
  const reporterId = (req as any).user?.uid as string | undefined
  await prisma.report.create({ data: { postId: req.params.id, reason, reporterId } })
  res.json({ ok: true })
})

export default router