/**
 * Authentication routes for user signup, login, token refresh, and logout.
 * Handles JWT creation and verification, secure refresh tokens via signed httpOnly cookies,
 * and applies rate limiting middleware to protect against brute-force attacks.
 */

import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { Secret, SignOptions } from 'jsonwebtoken'
import { LoginSchema, SignupSchema } from '../schemas/zod.js'
import User from '../models/user.js'
import { loginLimiter, signupLimiter } from '../middleware/rateLimit.js'

const router = Router()
const { sign, verify } = jwt

/**
 * JWT secret used for signing access tokens.
 * 
 * This secret should be a secure, unpredictable string and kept confidential.
 * It is used to sign and verify JWT access tokens that authenticate users.
 * Access tokens are short-lived and grant access to protected resources.
 * 
 * Defaults to 'change_me' if not set in environment variables, which is insecure.
 * Ensure to set a strong secret in production environments.
 * 
 * @constant {Secret}
 */
const JWT_SECRET: Secret = process.env.JWT_SECRET || 'change_me'

/**
 * JWT secret used for signing refresh tokens.
 * 
 * This secret should be distinct from JWT_SECRET and kept confidential.
 * It is used to sign and verify JWT refresh tokens that allow clients to
 * obtain new access tokens without re-authenticating.
 * Refresh tokens are long-lived and must be securely stored.
 * 
 * Defaults to 'change_me_refresh' if not set in environment variables, which is insecure.
 * Ensure to set a strong secret in production environments.
 * 
 * @constant {Secret}
 */
const JWT_REFRESH_SECRET: Secret = process.env.JWT_REFRESH_SECRET || 'change_me_refresh'

/**
 * Access token expiration duration.
 * 
 * Defines how long the access token remains valid before expiration.
 * Typically short-lived (e.g., 15 minutes) to limit exposure if compromised.
 * 
 * Defaults to '15m' if not set via environment variable ACCESS_TOKEN_TTL.
 * 
 * @constant {SignOptions['expiresIn']}
 */
const ACCESS_TOKEN_EXPIRES_IN: SignOptions['expiresIn'] = (process.env.ACCESS_TOKEN_TTL as any) || '7d'

/**
 * Refresh token expiration duration.
 * 
 * Defines how long the refresh token remains valid before expiration.
 * Typically longer-lived than access tokens (e.g., 7 days).
 * 
 * Defaults to '7d' if not set via environment variable REFRESH_TOKEN_TTL.
 * 
 * @constant {SignOptions['expiresIn']}
 */
const REFRESH_TOKEN_EXPIRES_IN: SignOptions['expiresIn'] = (process.env.REFRESH_TOKEN_TTL as any) || '7d'

/**
 * POST /auth/signup
 * 
 * Registers a new user in the system.
 * 
 * Request:
 * - Expects JSON body with { username, password, fullName }.
 * - Validates input using SignupSchema.
 * - Normalizes username to lowercase and trims whitespace for uniqueness.
 * - Hashes password securely with bcrypt before storing.
 * 
 * Response:
 * - On success, returns JSON with:
 *   - accessToken: JWT access token for immediate authentication.
 *   - user: object containing _id, username, and fullName (sensitive info excluded).
 * - Sets a signed, httpOnly refresh token cookie ('rt') to maintain session securely.
 * 
 * Security considerations:
 * - Passwords are never stored or returned in plaintext.
 * - Refresh token cookie is httpOnly and signed to prevent client-side access and tampering.
 * - Rate limiting middleware (signupLimiter) protects against brute-force signup attempts.
 * 
 * Edge cases:
 * - Returns 400 if username already exists or validation fails.
 * - Returns 500 for unexpected server errors.
 * 
 * @name Signup
 * @route POST /auth/signup
 * @middleware signupLimiter
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON response with tokens and user info or error message
 */
router.post('/signup', signupLimiter, async (req: Request, res: Response) => {
  try {
    let { username, password, fullName } = SignupSchema.parse(req.body)
    // Normalize username to lowercase and trim whitespace for uniqueness
    username = username.trim().toLowerCase()
    fullName = fullName.trim()

    const existingUser = await User.findOne({ username })
    if (existingUser) return res.status(400).json({ error: 'Username already exists' })

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = new User({
      username,
      password: hashedPassword,
      fullName,
    })

    await newUser.save()

    const accessToken = sign(
      { _id: newUser._id.toString(), username: newUser.username },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    )

    const refreshToken = sign(
      { _id: newUser._id.toString(), username: newUser.username },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    )

    // Set refresh token in a signed, httpOnly cookie to prevent client-side access and tampering
    res.cookie('rt', refreshToken, {
      httpOnly: true,
      signed: true,
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: '/',
    })

    return res.json({ accessToken, user: { _id: newUser._id, username: newUser.username, fullName: newUser.fullName } })
  } catch (err: any) {
    if (err?.name === 'ZodError') return res.status(400).json({ error: 'Invalid payload' })
    console.error('Signup error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

/**
 * POST /auth/login
 * 
 * Authenticates an existing user.
 * 
 * Request:
 * - Expects JSON body with { username, password }.
 * - Validates input using LoginSchema.
 * - Normalizes username to lowercase and trims whitespace.
 * - Compares provided password with stored hashed password using bcrypt.
 * 
 * Response:
 * - On success, returns JSON with:
 *   - accessToken: JWT access token for authenticated sessions.
 *   - user: object containing _id, username, and fullName.
 * - Sets a signed, httpOnly refresh token cookie ('rt') for session persistence.
 * 
 * Security considerations:
 * - Passwords are never returned or exposed in responses.
 * - Refresh token cookie is httpOnly and signed to prevent client-side access and tampering.
 * - Rate limiting middleware (loginLimiter) protects against brute-force login attempts.
 * 
 * Edge cases:
 * - Returns 401 for invalid credentials (wrong username or password).
 * - Returns 400 for invalid request payload.
 * - Returns 500 for unexpected server errors.
 * 
 * @name Login
 * @route POST /auth/login
 * @middleware loginLimiter
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON response with tokens and user info or error message
 */
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    let { username, password } = LoginSchema.parse(req.body)
    // Normalize username to lowercase and trim whitespace for consistent lookup
    username = username.trim().toLowerCase()

    const user = await User.findOne({ username })
    if (!user) return res.status(401).json({ error: 'Invalid username' })

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ error: 'wrong password ' })

    const accessToken = sign(
      { _id: user._id.toString(), username: user.username },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    )

    const refreshToken = sign(
      { _id: user._id.toString(), username: user.username },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    )

    // Set refresh token in a signed, httpOnly cookie to prevent client-side access and tampering
    res.cookie('rt', refreshToken, {
      httpOnly: true,
      signed: true,
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: '/',
    })

    return res
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production", // set true in production with HTTPS
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      })
      .json({ accessToken, user: { _id: user._id, username: user.username, fullName: (user as any).fullName } });
  } catch (err: any) {
    if (err?.name === 'ZodError') return res.status(400).json({ error: 'Invalid payload' })
    console.error('Login error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

/**
 * POST /auth/refresh
 * 
 * Issues a new access token by validating the refresh token sent in cookies.
 * 
 * Request:
 * - Requires a signed, httpOnly cookie named 'rt' containing a valid refresh token.
 * - The refresh token is verified using JWT_REFRESH_SECRET.
 * 
 * Response:
 * - On success, returns JSON with:
 *   - accessToken: new JWT access token.
 *   - user: object containing _id, username, and fullName (freshly fetched from DB).
 * 
 * Security considerations:
 * - Refresh tokens are stored securely in signed, httpOnly cookies to prevent XSS access.
 * - Verifies refresh token integrity and expiration.
 * - Fetches latest user data to ensure user still exists and retrieve updated profile info.
 * 
 * Edge cases:
 * - Returns 401 if refresh token is missing, invalid, expired, or user no longer exists.
 * 
 * @name RefreshToken
 * @route POST /auth/refresh
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON response with new access token and user info or error
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    // cookie-parser middleware must be enabled to access signedCookies
    const rt = (req as any).signedCookies?.rt || (req as any).cookies?.rt
    if (!rt) return res.status(401).json({ error: 'No refresh token' })

    const payload = verify(rt, JWT_REFRESH_SECRET) as any
    const accessToken = sign(
      { _id: payload._id, username: payload.username },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    )

    // Retrieve latest user info to include fullName and verify user still exists
    const u = await User.findById(payload._id).select('_id username fullName')
    if (!u) return res.status(401).json({ error: 'Invalid refresh token' })

    return res.json({ accessToken, user: { _id: u._id, username: u.username, fullName: (u as any).fullName } })
  } catch (e) {
    return res.status(401).json({ error: 'Invalid refresh token' })
  }
})

/**
 * POST /auth/logout
 * 
 * Logs out the user by clearing the refresh token cookie.
 * 
 * Request:
 * - Does not require any body or authentication.
 * 
 * Response:
 * - Clears the 'rt' cookie by setting it to expired.
 * - Returns JSON { ok: true } to indicate successful logout.
 * 
 * Security considerations:
 * - Removing the refresh token cookie effectively ends the session.
 * - Access tokens remain valid until expiration; client should discard them.
 * 
 * Edge cases:
 * - Idempotent operation; clearing a non-existent cookie is safe.
 * 
 * @name Logout
 * @route POST /auth/logout
 * @param {Request} _req - Express request object (unused)
 * @param {Response} res - Express response object
 * @returns {Response} JSON response indicating logout success
 */
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('rt', { path: '/' })
  return res.json({ ok: true })
})

export default router