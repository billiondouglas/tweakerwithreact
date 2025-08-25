/**
 * Posts Router — Tweet‑like resources over Mongo (Mongoose)
 *
 * Scope
 *  • AuthZ: lightweight JWT verification via Authorization: Bearer <access_token>
 *  • Create a post, fetch single post, global feed w/ stable cursor pagination
 *  • Toggle like / repost semantics using the Tweet collection
 *  • Minimal report endpoint (telemetry placeholder)
 *
 * Design
 *  • Stateless auth on each request; no session storage
 *  • Stable sort order: (createdAt desc, _id desc) to guarantee deterministic pagination
 *  • Cursor format: `${isoTimestamp}|${objectId}` so we can page without gaps/dupes
 *  • Input hygiene: trim + control‑char stripping; 280‑char cap to mirror Twitter
 *
 * Operational notes
 *  • Expects process.env.JWT_SECRET to verify tokens
 *  • Mounted by index.ts at `app.use('/posts', posts)`
 */

import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import Tweet from '../models/tweet.js'
import { authenticateJWT } from '../middleware/authenticate.js'
import { sanitizeTweetText } from '../utils/text.js'
import { timeAgo } from "../utils/text.js";
import User from '../models/user.js'
import Post from '../models/post.js'
import jwt from 'jsonwebtoken'

const router = Router()

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
/** Maximum characters allowed for a post */
const MAX_TWEET_LEN = 280

function getUserId(req: Request): string | undefined {
  try {
    const hdr = req.headers.authorization || ''
    const bearer = hdr.startsWith('Bearer ') ? hdr.slice(7) : undefined
    const token = bearer || (req as any).cookies?.token || (req as any).cookies?.rt
    if (!token) return undefined
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any
    return (payload?.sub || payload?.id || payload?._id) as string | undefined
  } catch {
    return undefined
  }
}

/**
 * Returns a human-friendly relative time string like "5s ago", "3m ago", "1h ago", etc.
 */


/**
 * buildCursorQuery
 * Creates a Mongo query segment for stable pagination based on a composite cursor.
 * Cursor format: `${isoTimestamp}|${objectId}` of the last item on the previous page.
 */
function buildCursorQuery(cursor?: string) {
  if (!cursor) return {}
  const [ts, id] = cursor.split('|')
  if (!ts || !id) return {}
  return {
    $or: [
      { createdAt: { $lt: new Date(ts) } },
      { createdAt: new Date(ts), _id: { $lt: id } },
    ],
  }
}

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------
/**
 * POST /posts
 * Body: { text: string }
 * Auth: Bearer access token
 * Effect: Creates a new post document in the Tweet collection.
 */
router.post('/', authenticateJWT, async (req: Request & { user?: any }, res: Response) => {
  // Validate shape + length with zod, then sanitize content
  const { text } = z.object({ text: z.string().min(1).max(MAX_TWEET_LEN) }).parse(req.body)
  const cleaned =  sanitizeTweetText(text)
  if (!cleaned) return res.status(400).json({ error: 'empty_text' })

  const doc = await Tweet.create({
    text: cleaned,
    username: req.user!.username,
    likes: [],
    comments: [],
    retweets: [],
    createdAt: new Date(),
  })

  const author = await User.findOne({ username: doc.username }).select('fullName username avatar verified').lean()

  res.status(201).json({
    id: String(doc._id),
    text: doc.text,
    created_at: doc.createdAt.toISOString(),
    relative_time: timeAgo(doc.createdAt),
    user: {
      fullName: author?.fullName || doc.username,
      username: doc.username,
      avatar: (author as any)?.avatar || null,
      verified: !!((author as any)?.verified),
    },
    like_count: Array.isArray((doc as any).likes) ? (doc as any).likes.length : Array.isArray((doc as any).likesBy) ? (doc as any).likesBy.length : 0,
    repost_count: Array.isArray(doc.retweets) ? doc.retweets.length : 0,
    reply_count: Array.isArray(doc.comments) ? doc.comments.length : 0,
    view_count: (doc as any).views ?? 0,
  })
})

/**
 * GET /posts/feed/global?cursor=<iso>|<id>
 * Public global feed, newest first, cursor‑paginated.
 */
router.get('/feed/global', async (req: Request, res: Response) => {
  const cursor = (req.query.cursor as string | undefined) ?? undefined
  const take = 20 // page size; keep modest for latency and mobile payloads

  const sort = { createdAt: -1, _id: -1 } as const
  const query = buildCursorQuery(cursor)

  const items = await Tweet.find(query).sort(sort).limit(take)
  const usernames = Array.from(new Set(items.map(p => p.username)))
  const authors = await User.find({ username: { $in: usernames } }).select('username fullName avatar verified').lean()
  const metaByUsername = new Map<string, { fullName: string; avatar?: string | null; verified: boolean }>(
    authors.map(a => [
      a.username,
      { fullName: (a as any).fullName, avatar: (a as any).avatar || null, verified: !!(a as any).verified },
    ])
  )
  const me = getUserId(req)

  const next = items.length === take
    ? `${items[items.length - 1].createdAt.toISOString()}|${items[items.length - 1]._id}`
    : null

  res.json({
    items: items.map(p => ({
      id: String(p._id),
      text: p.text,
      created_at: p.createdAt.toISOString(),
      relative_time: timeAgo(p.createdAt),
      parent_post_id: null,
      user: {
        fullName: (metaByUsername.get(p.username)?.fullName) || p.username,
        username: p.username,
        avatar: metaByUsername.get(p.username)?.avatar || null,
        verified: metaByUsername.get(p.username)?.verified || false,
      },
      like_count: (Array.isArray((p as any).likes) ? (p as any).likes.length : Array.isArray((p as any).likesBy) ? (p as any).likesBy.length : 0),
      liked: !!( me && Array.isArray((p as any).likes) && (p as any).likes.some((u:any)=> String(u)===String(me)) ),
      repost_count: p.retweets?.length || 0,
      reply_count: p.comments?.length || 0,
      view_count: (p as any).views ?? 0,
    })),
    nextCursor: next,
  })
})

/**
 * GET /posts/:id
 * Returns a single post by id.
 */
router.get('/:id', async (req: Request, res: Response) => {
  const p = await Tweet.findById(req.params.id)
  if (!p) return res.status(404).json({ error: 'not_found' })
  const author = await User.findOne({ username: p.username }).select('fullName username avatar verified').lean()
  res.json({
    id: String(p._id),
    text: p.text,
    created_at: p.createdAt.toISOString(),
    relative_time: timeAgo(p.createdAt),
    parent_post_id: null,
    user: {
      fullName: author?.fullName || p.username,
      username: p.username,
      avatar: (author as any)?.avatar || null,
      verified: !!((author as any)?.verified),
    },
    like_count: (Array.isArray((p as any).likes) ? (p as any).likes.length : Array.isArray((p as any).likesBy) ? (p as any).likesBy.length : 0),
    repost_count: p.retweets?.length || 0,
    reply_count: p.comments?.length || 0,
    view_count: (p as any).views ?? 0,
  })
})

/**
 * POST /posts/:id/like — toggle like by current user
 * DELETE /posts/:id/like — ensure unliked
 */
router.post('/:id/like', authenticateJWT, async (req: Request & { user?: any }, res: Response) => {
  const { id } = req.params;
  const uid = req.user!._id;
  await Tweet.updateOne({ _id: id }, { $addToSet: { likes: uid } });
  const t = await Tweet.findById(id).select('likes').lean();
  if (!t) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true, liked: true, like_count: (t as any).likes?.length || 0 });
});

router.delete('/:id/like', authenticateJWT, async (req: Request & { user?: any }, res: Response) => {
  const { id } = req.params;
  const uid = req.user!._id;
  await Tweet.updateOne({ _id: id }, { $pull: { likes: uid } });
  const t = await Tweet.findById(id).select('likes').lean();
  if (!t) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true, liked: false, like_count: (t as any).likes?.length || 0 });
})

/**
 * POST /posts/:id/repost — toggle repost by current user
 * DELETE /posts/:id/repost — ensure not reposted
 */
router.post('/:id/repost', authenticateJWT, async (req: Request & { user?: any }, res: Response) => {
  const t = await Tweet.findById(req.params.id)
  if (!t) return res.status(404).json({ error: 'not_found' })
  const uname = req.user!.username
  const has = (t.retweets || []).some((rt: any) => rt.username === uname)
  t.retweets = has
    ? (t.retweets || []).filter((rt: any) => rt.username !== uname)
    : [ ...(t.retweets || []), { username: uname, createdAt: new Date() } ]
  await t.save()
  res.json({ ok: true, repost_count: t.retweets.length })
})

router.delete('/:id/repost', authenticateJWT, async (req: Request & { user?: any }, res: Response) => {
  const t = await Tweet.findById(req.params.id)
  if (!t) return res.status(404).json({ error: 'not_found' })
  const uname = req.user!.username
  t.retweets = (t.retweets || []).filter((rt: any) => rt.username !== uname)
  await t.save()
  res.json({ ok: true, repost_count: t.retweets.length })
})

/**
 * POST /posts/:id/report
 * Body: { reason: string }
 * Note: this is a telemetry placeholder and does not store to DB yet.
 */
router.post('/:id/report', async (req: Request, res: Response) => {
  const { reason } = z.object({ reason: z.string().min(1).max(200) }).parse(req.body)
  console.warn('report received', { postId: req.params.id, reason })
  return res.json({ ok: true })
})

/**
 * GET /posts/user/:username?cursor=<iso>|<id>
 * Returns posts authored by :username, newest first, same shape as global feed.
 */
router.get('/user/:username', async (req: Request, res: Response) => {
  const { username } = req.params
  const cursor = (req.query.cursor as string | undefined) ?? undefined
  const me = getUserId(req)
  const take = 20
  const sort = { createdAt: -1, _id: -1 } as const

  const base = { username }
  const q = cursor ? { $and: [base, buildCursorQuery(cursor)] } : base

  const items = await Tweet.find(q).sort(sort).limit(take)
  const next = items.length === take
    ? `${items[items.length - 1].createdAt.toISOString()}|${items[items.length - 1]._id}`
    : null

  // single author lookup
  const author = await User.findOne({ username }).select('username fullName avatar verified').lean()
  const fullName = author?.fullName || username
  const avatar = (author as any)?.avatar || null
  const verified = !!((author as any)?.verified)

  res.json({
    items: items.map(p => ({
      id: String(p._id),
      text: p.text,
      created_at: p.createdAt.toISOString(),
      relative_time: timeAgo(p.createdAt),
      parent_post_id: null,
      user: { fullName, username, avatar, verified },
      like_count: (Array.isArray((p as any).likes) ? (p as any).likes.length : Array.isArray((p as any).likesBy) ? (p as any).likesBy.length : 0),
      liked: !!( me && Array.isArray((p as any).likes) && (p as any).likes.some((u:any)=> String(u)===String(me)) ),
      repost_count: p.retweets?.length || 0,
      reply_count: p.comments?.length || 0,
      view_count: (p as any).views ?? 0,
    })),
    nextCursor: next,
  })
})

/**
 * POST /posts/:id/like/toggle — per-user idempotent toggle
 * If user already liked → unlike; else → like. Always returns latest like_count.
 */
router.post('/:id/like/toggle', authenticateJWT, async (req: Request & { user?: any }, res: Response) => {
  const { id } = req.params;
  const uid = req.user!._id;

  // Check if already liked
  const already = await Tweet.exists({ _id: id, likes: uid });

  if (already) {
    await Tweet.updateOne({ _id: id }, { $pull: { likes: uid } });
  } else {
    await Tweet.updateOne({ _id: id }, { $addToSet: { likes: uid } });
  }

  const t = await Tweet.findById(id).select('likes').lean();
  if (!t) return res.status(404).json({ error: 'not_found' });

  return res.json({ ok: true, liked: !already, like_count: (t as any).likes?.length || 0 });
});

export default router