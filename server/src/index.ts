import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { authOptional } from './lib/auth.js'
import authRoutes from './routes/auth.js'
import postRoutes from './routes/posts.js'
import userRoutes from './routes/users.js'
import searchRoutes from './routes/search.js'

dotenv.config()
const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))
app.use(express.json())
app.use(authOptional)

app.use('/auth', authRoutes)
app.use('/posts', postRoutes)
app.use('/users', userRoutes)
app.use('/search', searchRoutes)

// Health
app.get('/health', (_req, res) => res.json({ ok: true }))

const port = Number(process.env.PORT || 4000)
app.listen(port, () => {
  console.log(`API on http://localhost:${port}`)
})