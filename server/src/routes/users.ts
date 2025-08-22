import { Router, Request, Response } from 'express'
import User from '../models/user.js'
import Tweet from '../models/tweet.js'

const router = Router()

// GET /users/suggested?take=6
// Returns a plain array of users: [{ id, fullName, username, avatar }]
router.get('/suggested', async (req: Request, res: Response) => {
  try {
    const take = Math.min(Number(req.query.take) || 6, 50)
    const docs = await User.find({}, { username: 1, fullName: 1, avatar: 1 })
      .sort({ createdAt: -1 })
      .limit(take)
      .lean()

    const users = (docs || []).map((u: any) => ({
      id: String(u._id),
      fullName: u.fullName || u.username || '',
      username: u.username || '',
      avatar: u.avatar || null,
    }))

    return res.json(users)
  } catch (e) {
    console.error('GET /users/suggested error:', e)
    return res.status(500).json({ error: 'server_error' })
  }
})

// Helper: build cursor query for stable pagination by createdAt then _id
function buildCursorQuery(cursor?: string) {
  if (!cursor) return {}
  // cursor format: `${isoTimestamp}|${objectId}`
  const [ts, id] = cursor.split('|')
  if (!ts || !id) return {}
  return {
    $or: [
      { createdAt: { $lt: new Date(ts) } },
      { createdAt: new Date(ts), _id: { $lt: id } }
    ]
  }
}

// GET /users/:username/posts?cursor=
// Returns paginated list of a user's tweets
router.get('/:username/posts', async (req: Request, res: Response) => {
  try {
    const username = String(req.params.username || '').trim().toLowerCase()
    const take = Math.min(Number(req.query.take) || 20, 50)
    const cursor = (req.query.cursor as string | undefined) ?? undefined

    // ensure user exists
    const u = await User.findOne({ username }).select('_id username fullName')
    if (!u) return res.json({ items: [], nextCursor: null })

    const query = { username: u.username, ...buildCursorQuery(cursor) }

    const items = await Tweet.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(take)

    const next = items.length === take
      ? `${items[items.length - 1].createdAt.toISOString()}|${items[items.length - 1]._id}`
      : null

    return res.json({
      items: items.map((p) => ({
        id: String(p._id),
        text: p.text,
        created_at: p.createdAt,
        parent_post_id: null,
        user: { id: String(u._id), handle: u.username, fullName: (u as any).fullName },
        like_count: Array.isArray(p.likes) ? p.likes.length : 0,
        repost_count: Array.isArray(p.retweets) ? p.retweets.length : 0,
      })),
      nextCursor: next,
    })
  } catch (e) {
    console.error('GET /users/:username/posts error:', e)
    return res.status(500).json({ error: 'server_error' })
  }
})

// GET /users/:username/profile → minimal public profile
router.get('/:username/profile', async (req: Request, res: Response) => {
  try {
    const username = String(req.params.username || '').trim().toLowerCase()
    const u = await User.findOne({ username }).select('_id username fullName')
    if (!u) return res.status(404).json({ error: 'not_found' })
    return res.json({ id: String(u._id), username: u.username, fullName: (u as any).fullName })
  } catch (e) {
    console.error('GET /users/:username/profile error:', e)
    return res.status(500).json({ error: 'server_error' })
  }
})

export default router