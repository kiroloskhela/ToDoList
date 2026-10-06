export type ErrorCode = 'VALIDATION_ERROR' | 'INVALID_ID' | 'INVALID_VERSION' | 'TASK_NOT_FOUND' |
  'PRECONDITION_REQUIRED' | 'INVALID_ETAG' | 'PRECONDITION_FAILED' | 'DATABASE_UNAVAILABLE' |
  'VERSION_EXHAUSTED' | 'INTERNAL_ERROR';
export class TaskError extends Error {
  constructor(public readonly code: ErrorCode, message: string, public readonly fields?: Record<string, string[]>) {
    super(message); this.name = 'TaskError';
  }
}
