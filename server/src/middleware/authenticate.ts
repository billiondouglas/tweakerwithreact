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

/**
 * authenticateJWT
 *  • Accepts `Authorization: Bearer <token>` (case-insensitive)
 *  • Verifies with HS256 and attaches `{ _id, username }` to req.user
 *  • Returns 401 with a `WWW-Authenticate` header on failure
 */
export function authenticateJWT(req: RequestWithUser, res: Response, next: NextFunction) {
  let token: string | undefined;
  const auth = req.headers.authorization;
  if (auth && /^Bearer\s+/i.test(auth)) {
    token = auth.replace(/^Bearer\s+/i, '');
  } else if (req.signedCookies?.accessToken) {
    token = req.signedCookies.accessToken;
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    res.setHeader('WWW-Authenticate', 'Bearer realm="api", error="invalid_request"');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload | string
    const data = typeof payload === 'string' ? undefined : payload

    if (!data || typeof (data as any)._id !== 'string' || typeof (data as any).username !== 'string') {
      res.setHeader('WWW-Authenticate', 'Bearer realm="api", error="invalid_token"')
      return res.status(401).json({ error: 'Invalid token' })
    }

    req.user = { _id: (data as any)._id, username: (data as any).username }
    return next()
  } catch {
    res.setHeader('WWW-Authenticate', 'Bearer realm="api", error="invalid_token"')
    return res.status(401).json({ error: 'Invalid token' })
  }
}