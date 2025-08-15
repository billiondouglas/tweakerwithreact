import jwt from 'jsonwebtoken'
import { prisma } from './prisma.js'
import { Request, Response, NextFunction } from 'express'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

export type JwtPayload = { uid: string, handle: string }

export function signToken(p: JwtPayload) {
  return jwt.sign(p, JWT_SECRET, { expiresIn: '7d' })
}

export function authOptional(req: Request, _res: Response, next: NextFunction) {
  const hdr = req.header('authorization')
  if (!hdr?.startsWith('Bearer ')) return next()
  const token = hdr.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload
    ;(req as any).user = payload
  } catch {}
  next()
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const u = (req as any).user as JwtPayload | undefined
  if (!u) return res.status(401).json({ error: 'unauthorized' })
  next()
}

export async function ensureHandleUnique(desired: string) {
  let base = desired.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16) || 'user'
  let candidate = base
  let i = 0
  while (await prisma.user.findUnique({ where: { handle: candidate } })) {
    i += 1
    candidate = `${base}${i}`
  }
  return candidate
}