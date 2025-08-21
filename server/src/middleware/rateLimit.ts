// server/src/middleware/rateLimit.ts
import rateLimit from "express-rate-limit";

/**
 * Generic factory function for a rate limiter.
 */
function createLimiter(windowMs: number, max: number, message: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
    message,
  });
}

// Rate limiter for login attempts
export const loginLimiter = createLimiter(
  Number(process.env.RATE_WINDOW_MS) || 15 * 60 * 1000, // default 15 mins
  Number(process.env.RATE_LOGIN_MAX) || 10,             // max 10 attempts
  "Too many login attempts, please try again later."
);

// Rate limiter for signup
export const signupLimiter = createLimiter(
  Number(process.env.RATE_WINDOW_MS) || 15 * 60 * 1000, // default 15 mins
  Number(process.env.RATE_SIGNUP_MAX) || 5,             // max 5 attempts
  "Too many signup attempts, please try again later."
);

// Rate limiter for comments
export const commentLimiter = createLimiter(
  Number(process.env.RATE_COMMENT_WINDOW_MS) || 60 * 1000, // default 1 min
  Number(process.env.RATE_COMMENT_MAX) || 20,              // max 20 attempts
  "Too many comments, please slow down."
);