import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
export const requestId: RequestHandler = (_request, response, next) => {
  response.locals.requestId = randomUUID();
  response.setHeader('X-Request-Id', response.locals.requestId);
  response.setHeader('Cache-Control', 'no-store');
  next();
};
