import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { signToken, ensureHandleUnique } from '../lib/auth.js'
import { z } from 'zod'

const router = Router()

// POST /auth/anon  { handle? }
// Creates a pseudonymous user and returns JWT
router.post('/anon', async (req, res) => {
  const body = z.object({ handle: z.string().min(1).max(16).optional() }).parse(req.body)
  const desired = body.handle ?? `anon${Math.floor(Math.random()*10000)}`
  const handle = await ensureHandleUnique(desired)

  const user = await prisma.user.create({ data: { handle } })
  await prisma.session.create({ data: { userId: user.id } })
  const token = signToken({ uid: user.id, handle: user.handle })
  res.json({ accessToken: token, handle: user.handle })
})

// POST /handles/rotate
router.post('/handles/rotate', async (req, res) => {
  // naive rotate: create a new unique handle and update
  const user = (req as any).user as { uid: string } | undefined
  if (!user) return res.status(401).json({ error: 'unauthorized' })
  const newHandle = await ensureHandleUnique(`anon${Math.floor(Math.random()*10000)}`)
  const updated = await prisma.user.update({ where: { id: user.uid }, data: { handle: newHandle } })
  const token = signToken({ uid: updated.id, handle: updated.handle })
  res.json({ accessToken: token, handle: updated.handle })
})

export default router