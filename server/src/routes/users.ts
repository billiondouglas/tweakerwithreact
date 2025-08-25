import { Router, Request, Response } from 'express'
import User from '../models/user.js'
import Tweet from '../models/tweet.js'
import multer from 'multer'
import { authenticateJWT } from '../middleware/authenticate.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

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

// GET /users/me → current authenticated user
router.get('/me', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })
    const u = await User.findById(userId).lean()
    if (!u) return res.status(404).json({ error: 'not_found' })
    return res.json({
      id: String(u._id),
      username: u.username,
      fullName: u.fullName,
      bio: (u as any).bio ?? '',
      link: (u as any).link ?? '',
      coverImage: (u as any).coverImage ?? null,
      avatar: (u as any).avatar ?? null,
      followers: Array.isArray((u as any).followers) ? (u as any).followers.length : 0,
      following: Array.isArray((u as any).following) ? (u as any).following.length : 0,
      verified: !!(u as any).verified,
      createdAt: (u as any).createdAt,
      updatedAt: (u as any).updatedAt,
    })
  } catch (e) {
    console.error('GET /users/me error:', e)
    return res.status(500).json({ error: 'server_error' })
  }
})

// PUT /users/me  (update profile: JSON or multipart)
// Accepts fields: fullName, bio, link
// Accepts files: cover, avatar
router.put(
  '/me',
  authenticateJWT,
  upload.fields([{ name: 'cover', maxCount: 1 }, { name: 'avatar', maxCount: 1 }]),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?._id || (req as any).user?.id
      if (!userId) return res.status(401).json({ error: 'unauthorized' })

      const { fullName, bio, link } = (req.body || {}) as {
        fullName?: string
        bio?: string
        link?: string
      }

      // Convert uploaded files to data URLs (placeholder storage).
      // Replace with a real uploader (S3/Cloudinary) in production.
      let coverImageUrl: string | undefined
      let avatarUrl: string | undefined

      const files = req.files as any
      const coverFile = files?.cover?.[0]
      const avatarFile = files?.avatar?.[0]

      if (coverFile) {
        coverImageUrl = `data:${coverFile.mimetype};base64,${coverFile.buffer.toString('base64')}`
      }
      if (avatarFile) {
        avatarUrl = `data:${avatarFile.mimetype};base64,${avatarFile.buffer.toString('base64')}`
      }

      const update: any = {}
if (typeof fullName === 'string' && fullName.trim()) update.fullName = fullName.trim()
if (typeof bio === 'string') update.bio = bio
if (typeof link === 'string') update.link = link.trim()
if (coverImageUrl) update.coverImage = coverImageUrl
if (avatarUrl) update.avatar = avatarUrl

const updated = await User.findByIdAndUpdate(userId, { $set: update }, { new: true }).lean()
if (!updated) return res.status(404).json({ error: 'not_found' })

return res.json({
  id: String(updated._id),
  username: updated.username,
  fullName: updated.fullName,
  bio: (updated as any).bio ?? '',
  link: (updated as any).link ?? '',
  coverImage: (updated as any).coverImage ?? null,
  avatar: (updated as any).avatar ?? null,
  followers: Array.isArray((updated as any).followers) ? (updated as any).followers.length : 0,
  following: Array.isArray((updated as any).following) ? (updated as any).following.length : 0,
  verified: !!(updated as any).verified,
  createdAt: (updated as any).createdAt,
  updatedAt: (updated as any).updatedAt,
})
    } catch (e) {
      console.error('PUT /users/me error:', e)
      return res.status(500).json({ error: 'server_error' })
    }
  }
)

// POST /users/:username/follow — follow a user
router.post('/:username/follow', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const meId = (req as any).user?._id || (req as any).user?.id
    if (!meId) return res.status(401).json({ error: 'unauthorized' })

    const username = String(req.params.username || '').trim().toLowerCase()
    const target = await User.findOne({ username }).select('_id username').lean()
    if (!target) return res.status(404).json({ error: 'not_found' })
    if (String(target._id) === String(meId)) {
      return res.status(400).json({ error: 'cannot_follow_self' })
    }

    await User.updateOne({ _id: meId }, { $addToSet: { following: target._id } })
    await User.updateOne({ _id: target._id }, { $addToSet: { followers: meId } })

    const t = await User.findById(target._id).select('followers following').lean()
    const meDoc = await User.findById(meId).select('following').lean()

    const isFollowing = Array.isArray((meDoc as any)?.following)
      ? (meDoc as any).following.some((id: any) => String(id) === String(target._id))
      : false

    return res.json({
      ok: true,
      isFollowing,
      counts: {
        followers: Array.isArray((t as any)?.followers) ? (t as any).followers.length : 0,
        following: Array.isArray((t as any)?.following) ? (t as any).following.length : 0,
      },
    })
  } catch (e) {
    console.error('POST /users/:username/follow error:', e)
    return res.status(500).json({ error: 'server_error' })
  }
})

// DELETE /users/:username/follow — unfollow a user
router.delete('/:username/follow', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const meId = (req as any).user?._id || (req as any).user?.id
    if (!meId) return res.status(401).json({ error: 'unauthorized' })

    const username = String(req.params.username || '').trim().toLowerCase()
    const target = await User.findOne({ username }).select('_id username').lean()
    if (!target) return res.status(404).json({ error: 'not_found' })
    if (String(target._id) === String(meId)) {
      return res.status(400).json({ error: 'cannot_unfollow_self' })
    }

    await User.updateOne({ _id: meId }, { $pull: { following: target._id } })
    await User.updateOne({ _id: target._id }, { $pull: { followers: meId } })

    const t = await User.findById(target._id).select('followers following').lean()
    const meDoc = await User.findById(meId).select('following').lean()

    const isFollowing = Array.isArray((meDoc as any)?.following)
      ? (meDoc as any).following.some((id: any) => String(id) === String(target._id))
      : false

    return res.json({
      ok: true,
      isFollowing,
      counts: {
        followers: Array.isArray((t as any)?.followers) ? (t as any).followers.length : 0,
        following: Array.isArray((t as any)?.following) ? (t as any).following.length : 0,
      },
    })
  } catch (e) {
    console.error('DELETE /users/:username/follow error:', e)
    return res.status(500).json({ error: 'server_error' })
  }
})

// GET /users/:username/relationship — is current user following target?
router.get('/:username/relationship', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const meId = (req as any).user?._id || (req as any).user?.id
    const username = String(req.params.username || '').trim().toLowerCase()
    if (!meId) return res.json({ isFollowing: false })

    const target = await User.findOne({ username }).select('_id').lean()
    if (!target) return res.json({ isFollowing: false })

    const meDoc = await User.findById(meId).select('following').lean()
    const isFollowing = Array.isArray((meDoc as any)?.following)
      ? (meDoc as any).following.some((id: any) => String(id) === String(target._id))
      : false

    return res.json({ isFollowing })
  } catch (e) {
    console.error('GET /users/:username/relationship error:', e)
    return res.status(500).json({ error: 'server_error' })
  }
})

// GET /users → all users for WhoToFollow
router.get('/', async (req: Request, res: Response) => {
  try {
    const docs = await User.find({}, { username: 1, fullName: 1, avatar: 1 })
      .sort({ createdAt: -1 })
      .lean();

    const users = (docs || []).map((u: any) => ({
      id: String(u._id),
      fullName: u.fullName || u.username || '',
      username: u.username || '',
      avatar: u.avatar || null,
    }));

    return res.json(users);
  } catch (e) {
    console.error('GET /users error:', e);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router