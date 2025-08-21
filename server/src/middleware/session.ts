import session from 'express-session'
import MongoStore from 'connect-mongo'

const ONE_DAY_MS = 1000 * 60 * 60 * 24

// Session middleware only. Do NOT put routes here.
export default function sessionMiddleware() {
  const mongoUrl = process.env.MONGO_URI
  if (!mongoUrl) throw new Error('MONGO_URI is required for session store')

  return session({
    name: 'sid',
    secret: process.env.SESSION_SECRET || 'supersecretkey',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl,
      dbName: process.env.MONGO_DB, // optional; falls back to DB from URI
      collectionName: 'sessions',
      stringify: false,
      crypto: {
        secret: process.env.SESSION_STORE_SECRET || process.env.SESSION_SECRET || 'supersecretkey',
      },
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: ONE_DAY_MS,
    },
  })
}
