/**
 * Tweaker Backend — Express + Mongo (Mongoose)
 *
 * Responsibilities:
 *  • Security middleware (helmet, CORS, cookie-parser)
 *  • Mongo connection and health endpoint
 *  • JWT auth (access + refresh) and cookie handling
 *  • Auth routes mount (/auth) and inline /signup, /auth/me, /auth/refresh, /auth/logout
 *  • Posts router mounted at /posts (tweet-like features)
 */

/** Env first so process.env is available */
import './env.js'

/** Core framework + types */
import express from 'express'
import type { Request, Response } from 'express'

/** Security + HTTP hardening */
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'

/** Database */
import mongoose from 'mongoose'

/** Auth + hashing */
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

/** Local models and routers */
import User from './models/user.js'
import authRouter from './routes/auth.js'
import posts from './routes/posts.js'
import users from './routes/users.js'
import commentsRouter from './routes/comments.js'

/** Rate limiting */
import { signupLimiter, loginLimiter } from './middleware/rateLimit.js'

import { authenticateJWT } from './middleware/authenticate.js'

/** Express app bootstrap */
const app = express()

app.set('trust proxy', 1)
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[REQ] ${req.method} ${req.originalUrl}`)
  }
  next()
})

/**
 * Global middleware
 *  • helmet: sets secure HTTP headers
 *  • express.json: parses JSON bodies with higher limit
 *  • express.urlencoded: parses urlencoded bodies
 *  • cookieParser: parses and verifies signed cookies (refresh token)
 */
app.use(helmet())
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true, limit: '2mb' }))
app.use(cookieParser(process.env.COOKIE_SECRET || 'fallback_cookie_secret'))

/**
 * CORS
 *  • Allow known dev origins and include credentials
 *  • Must run before any route mounts
 */
const allowlist = new Set([
  process.env.CORS_ORIGIN || 'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
])
const corsOpts: cors.CorsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true)
    if (allowlist.has(origin)) return cb(null, true)
    return cb(new Error('CORS blocked'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  maxAge: 86400,
}
app.use(cors(corsOpts))
app.options('*', cors(corsOpts))

/** Liveness + DB status */
app.get('/health', (_req, res) => {
  res.json({ ok: true, db: mongoose.connection.readyState, dbName: mongoose.connection.db?.databaseName || null })
})

/** Mount feature routers */
app.use('/api/posts', posts)
app.use('/api/users', users)
app.use('/api/comments', commentsRouter)

/** Apply login rate limiter before /auth/login route */
app.use('/api/auth/login', loginLimiter)
app.use('/api/auth', authRouter)

/** Port and JWT config (env-driven) */
// Port for HTTP server
const PORT = process.env.PORT || 4000

// Secrets and lifetimes for JWTs
const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET || 'change_me'              // access token secret
const JWT_REFRESH_SECRET: jwt.Secret = process.env.JWT_REFRESH_SECRET || 'change_me_refresh' // refresh token secret
const ACCESS_TOKEN_EXPIRES_IN: jwt.SignOptions['expiresIn'] = (process.env.ACCESS_TOKEN_TTL as any) || '15m' // short lived
const REFRESH_TOKEN_EXPIRES_IN: jwt.SignOptions['expiresIn'] = (process.env.REFRESH_TOKEN_TTL as any) || '7d' // longer lived

/**
 * MongoDB connection
 *  • Requires MONGO_URI in .env
 *  • Optional MONGO_DB to override DB via driver option
 */
const mongoUri = process.env.MONGO_URI
if (!mongoUri || typeof mongoUri !== 'string') {
  console.error('❌ MONGO_URI is missing. Set it in /server/.env')
  process.exit(1)
}

const DB_NAME = process.env.MONGO_DB

mongoose
  .connect(mongoUri, DB_NAME ? { dbName: DB_NAME, serverSelectionTimeoutMS: 15000 } : { serverSelectionTimeoutMS: 15000 })
  .then(() => {
    // @ts-ignore — driver type may not expose .db
    console.log('✅ MongoDB connected (db =', mongoose.connection.db?.databaseName || '(from URI)', ')')
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    if (err.name === 'MongoServerSelectionError') {
      console.error('MongoDB connection timeout:', err.message)
    } else {
      console.error('MongoDB error:', err)
    }
    process.exit(1)
  })

/** Return fresh profile from DB for the current access token */
app.get('/api/auth/me', authenticateJWT, async (req: Request & { user?: any }, res: Response) => {
  try {
    const u = await User.findById(req.user?._id).select('_id username fullName')
    if (!u) return res.status(404).json({ error: 'User not found' })
    return res.json({ user: { _id: u._id, username: u.username, fullName: (u as any).fullName } })
  } catch (e) {
    return res.status(500).json({ error: 'Server error' })
  }
})

/** Simple probe to test that JWT middleware works */
app.get('/api/protected', authenticateJWT, (req: Request & { user?: any }, res: Response) => {
  res.json({ ok: true, user: req.user })
})

// signup route
app.post('/api/auth/signup', signupLimiter, async (req: Request, res: Response) => {
  // Normalize input
  const username = String((req.body as any)?.username || '').trim().toLowerCase()
  const fullName = String((req.body as any)?.fullName || '').trim()

  // Validate fields
  if (!/^[a-zA-Z\s]{2,50}$/.test(fullName)) {
    return res.status(400).json({ error: '⚠️ Full name must be 2–50 letters and spaces only' })
  }
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: '⚠️ Invalid username format' })
  }
  const password = String((req.body as any)?.password || '').trim()
  if (username.length < 3 || password.length < 6) {
    return res.status(400).json({ error: '⚠️ Password or username too short' })
  }

  try {
    // Uniqueness check
    const existing = await User.findOne({ username })
    if (existing) return res.status(400).json({ error: '⚠️ Username already exists' })

    // Hash password and create recovery secret
    const hashed = await bcrypt.hash(password, 10)
    const secretKey = Array.from({ length: 12 }).map(() => Math.random().toString(36).slice(2, 6)).join(' ')

    // Persist user
    const user = await User.create({ username, fullName, password: hashed, secretKey })

    // Log creation target for sanity
    console.log('👤 User created:', user._id.toString(), '→ collection:', (User as any).collection?.name, 'db:', mongoose.connection.db?.databaseName)

    // Issue JWTs
    const accessToken = jwt.sign({ _id: user._id.toString(), username: user.username }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN })
    const refreshToken = jwt.sign({ _id: user._id.toString(), username: user.username }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN })

    // Set signed httpOnly refresh cookie
    res.cookie('rt', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
      signed: true,
    })

    // Respond with access token and public user fields
    return res.status(201).json({ message: 'User created', secretKey, accessToken, user: { _id: user._id, username: user.username, fullName: user.fullName } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: '⚠️ Signup failed' })
  }
})

// Alias: some clients call /api/signup — keep behavior identical to /api/auth/signup
app.post('/api/signup', signupLimiter, async (req: Request, res: Response) => {
  const username = String((req.body as any)?.username || '').trim().toLowerCase()
  const fullName = String((req.body as any)?.fullName || '').trim()

  if (!/^[a-zA-Z\s]{2,50}$/.test(fullName)) {
    return res.status(400).json({ error: '⚠️ Full name must be 2–50 letters and spaces only' })
  }
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: '⚠️ Invalid username format' })
  }
  const password = String((req.body as any)?.password || '').trim()
  if (username.length < 3 || password.length < 6) {
    return res.status(400).json({ error: '⚠️ Password or username too short' })
  }

  try {
    const existing = await User.findOne({ username })
    if (existing) return res.status(400).json({ error: '⚠️ Username already exists' })

    const hashed = await bcrypt.hash(password, 10)
    const secretKey = Array.from({ length: 12 }).map(() => Math.random().toString(36).slice(2, 6)).join(' ')

    const user = await User.create({ username, fullName, password: hashed, secretKey })

    const accessToken = jwt.sign({ _id: user._id.toString(), username: user.username }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN })
    const refreshToken = jwt.sign({ _id: user._id.toString(), username: user.username }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN })

    res.cookie('rt', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
      signed: true,
    })

    return res.status(201).json({ message: 'User created', secretKey, accessToken, user: { _id: user._id, username: user.username, fullName: user.fullName } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: '⚠️ Signup failed' })
  }
})

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERR]', err?.message || err)
  if (err?.message === 'CORS blocked') {
    return res.status(403).json({ error: 'CORS blocked' })
  }
  res.status(500).json({ error: 'server_error' })
})