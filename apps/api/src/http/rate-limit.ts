import { rateLimit } from 'express-rate-limit';
export const createRequestLimiter = (limit: number) => rateLimit({
  windowMs: 60000, limit, standardHeaders: 'draft-8', legacyHeaders: false,
  handler: (_request, response) => response.status(429).json({ error: {
    code: 'RATE_LIMITED', message: 'Too many requests. Please wait and try again.', requestId: response.locals.requestId,
  } }),
});
