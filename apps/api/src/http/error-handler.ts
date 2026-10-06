import type { ErrorRequestHandler } from 'express';
import { TaskError, type ErrorCode } from '../errors/task-errors.js';
const statuses: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 422, INVALID_ID: 400, INVALID_VERSION: 400, TASK_NOT_FOUND: 404,
  PRECONDITION_REQUIRED: 428, INVALID_ETAG: 400, PRECONDITION_FAILED: 412,
  DATABASE_UNAVAILABLE: 503, VERSION_EXHAUSTED: 409, INTERNAL_ERROR: 500,
};
export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (response.headersSent) { next(error); return; }
  if (error instanceof TaskError) {
    if (error.code === 'DATABASE_UNAVAILABLE') response.setHeader('Retry-After', '1');
    response.status(statuses[error.code]).json({ error: {
      code: error.code, message: error.message, fields: error.fields, requestId: response.locals.requestId,
    } });
    return;
  }
  const parserStatus = error instanceof Error && 'status' in error ? Number(error.status) : 500;
  const parserErrors: Record<number, [string, string]> = {
    400: ['INVALID_JSON', 'Request body must be valid JSON.'],
    413: ['PAYLOAD_TOO_LARGE', 'Request body exceeds 32 KiB.'],
    415: ['UNSUPPORTED_MEDIA_TYPE', 'Use uncompressed application/json.'],
  };
  const known = parserErrors[parserStatus];
  if (!known) console.error(JSON.stringify({ event: 'request_error', requestId: response.locals.requestId,
    errorType: error instanceof Error ? error.name : 'Unknown' }));
  response.status(known ? parserStatus : 500).json({ error: {
    code: known?.[0] ?? 'INTERNAL_ERROR', message: known?.[1] ?? 'An unexpected error occurred.', requestId: response.locals.requestId,
  } });
};
