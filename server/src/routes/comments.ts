/**
 * Comments Router — handles replies to posts
 *
 * Endpoints:
 *  • POST /comments/:postId   → add a comment to a post
 *  • GET /comments/:postId    → list comments for a post
 */

import { Router, Request, Response } from "express"
import { z } from "zod"
import { authenticateJWT, type RequestWithUser } from "../middleware/authenticate.js"
import { commentLimiter } from "../middleware/rateLimit.js"
import Tweet from "../models/tweet.js"
import type { IComment } from "../models/tweet.js"
import { sanitizeTweetText, timeAgo } from "../utils/text.js"
import User from "../models/user.js"
import { Types } from "mongoose"


const router = Router()

function ensureValidObjectId(id: string) {
  if (!Types.ObjectId.isValid(id)) {
    const err: any = new Error('invalid_id')
    err.status = 400
    throw err
  }
}

router.post(
  "/:postId",
  commentLimiter,
  authenticateJWT,
  async (req: RequestWithUser, res: Response) => {
    try {
      ensureValidObjectId(req.params.postId)

      const Body = z.object({ text: z.string().min(1).max(280) })
      const { text } = Body.parse(req.body)

      const clean = sanitizeTweetText(text)
      if (!clean) return res.status(400).json({ error: "empty_text" })

      const post = await Tweet.findById(req.params.postId)
      if (!post) return res.status(404).json({ error: "post_not_found" })

      const comment = {
        username: req.user!.username,
        text: clean,
        createdAt: new Date(),
      }

      post.comments = Array.isArray(post.comments) ? post.comments : []
      post.comments.push(comment)
      await post.save()

      // Resolve fullName for the commenting user
      const me = await User.findOne({ username: comment.username })
        .select('username fullName')
        .lean()

      return res.status(201).json({
        ok: true,
        reply_count: post.comments.length,
        comment: {
          username: comment.username,
          fullName: me?.fullName || comment.username,
          text: comment.text,
          created_at: comment.createdAt.toISOString(),
          relative_time: timeAgo(comment.createdAt ?? comment.createdAt),
        },
      })
    } catch (err: any) {
      if (err?.name === 'ZodError') {
        return res.status(400).json({ error: 'invalid_payload', details: err.issues })
      }
      const status = err?.status || 500
      return res.status(status).json({ error: status === 400 ? 'invalid_id' : 'server_error' })
    }
  }
)

router.get(
  "/:postId",
  async (req: Request, res: Response) => {
    try {
      ensureValidObjectId(req.params.postId)

      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100)
      const cursor = Math.max(Number(req.query.cursor) || 0, 0)

      const post = await Tweet
        .findById(req.params.postId)
        .lean<{ comments?: IComment[] }>()
      if (!post) return res.status(404).json({ error: "post_not_found" })

      const all = Array.isArray(post.comments) ? post.comments : []
      // newest first
      all.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      const slice = all.slice(cursor, cursor + limit)

      // Resolve fullName for each unique commenter in this page
      const usernames = [...new Set(slice.map((c: any) => c.username))]
      const users = await User.find({ username: { $in: usernames } })
        .select('username fullName')
        .lean()
      const nameMap = new Map(users.map((u: any) => [u.username, u.fullName]))

      const items = slice.map((c: any) => ({
        username: c.username,
        fullName: nameMap.get(c.username) || c.username,
        text: c.text,
        created_at: new Date(c.createdAt).toISOString(),
        relative_time: timeAgo(new Date(c.createdAt)),
      }))

      const nextCursor = cursor + slice.length < all.length ? cursor + slice.length : null

      return res.json({ reply_count: all.length, items, nextCursor })
    } catch (err: any) {
      const status = err?.status || 500
      return res.status(status).json({ error: status === 400 ? 'invalid_id' : 'server_error' })
    }
  }
)

export default router