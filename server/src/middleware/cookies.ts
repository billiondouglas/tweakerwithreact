// server/src/middleware/cookies.ts
import cookieParser from 'cookie-parser';

const secret = process.env.COOKIE_SECRET;
if (!secret) {
  throw new Error('COOKIE_SECRET environment variable is required for cookie-parser middleware');
}

export default cookieParser(secret);