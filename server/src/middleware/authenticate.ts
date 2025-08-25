import { Request, Response, NextFunction } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'

// Public types for downstream handlers
export type AuthUser = { _id: string; username: string }
export type RequestWithUser = Request & { user?: AuthUser }

// Secret and safety warning (single-run)
const JWT_SECRET = process.env.JWT_SECRET || 'change_me'
let warned = false
if (JWT_SECRET === 'change_me' && !warned) {
  warned = true
  console.warn('⚠️ JWT_SECRET is using a fallback value. Set a strong JWT_SECRET in your environment for production.')
}

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change_me_refresh'
if (JWT_REFRESH_SECRET === 'change_me_refresh') {
  console.warn('⚠️ JWT_REFRESH_SECRET is using a fallback value. Set a strong JWT_REFRESH_SECRET in your environment for production.')
}

/**
 * authenticateJWT
 *  • Accepts `Authorization: Bearer <token>` (access token)
 *  • Or accepts signed/unsigned refresh cookie `rt`
 *  • Verifies with HS256 (access uses JWT_SECRET, refresh uses JWT_REFRESH_SECRET)
 *  • Attaches `{ _id, username }` to req.user
 */
export function authenticateJWT(req: RequestWithUser, res: Response, next: NextFunction) {
  // 1) Extract token from Authorization header or refresh cookie `rt`
  const auth = req.headers.authorization
  const bearer = auth && /^Bearer\s+/i.test(auth) ? auth.replace(/^Bearer\s+/i, '') : undefined
  const rtCookie = req.signedCookies?.rt || req.cookies?.rt

  let token: string | undefined
  let isRefresh = false

  if (bearer) {
    token = bearer
    isRefresh = false
  } else if (rtCookie) {
    token = rtCookie
    isRefresh = true
  }

  if (!token) {
    res.setHeader('WWW-Authenticate', 'Bearer realm="api", error="invalid_request"')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const secret = isRefresh ? JWT_REFRESH_SECRET : JWT_SECRET
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as JwtPayload | string
    const data = typeof payload === 'string' ? undefined : payload

    if (!data) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="api", error="invalid_token"')
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Normalize common id fields from tokens created by different issuers
    const uid = (data as any)._id || (data as any).id || (data as any).sub
    const uname = (data as any).username

    if (typeof uid !== 'string') {
      res.setHeader('WWW-Authenticate', 'Bearer realm="api", error="invalid_token"')
      return res.status(401).json({ error: 'Invalid token' })
    }

    req.user = { _id: uid, username: typeof uname === 'string' ? uname : '' }
    return next()
  } catch {
    res.setHeader('WWW-Authenticate', 'Bearer realm="api", error="invalid_token"')
    return res.status(401).json({ error: 'Invalid token' })
  }
}