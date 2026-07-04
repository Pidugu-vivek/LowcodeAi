import rateLimit from 'express-rate-limit';

export const globalRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: Number(process.env.RATE_LIMIT_PER_MINUTE) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
});
