import { TaskError } from './task-errors.js';
export const mapPgError = (error: unknown): Error => {
  if (!(error instanceof Error)) return new Error('Unknown database error.');
  const code = 'code' in error ? String(error.code) : '';
  if (code.startsWith('08') || ['57014', '55P03', '57P01', '57P02', '57P03', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'].includes(code) || /timeout|connection terminated/i.test(error.message)) {
    return new TaskError('DATABASE_UNAVAILABLE', 'The board is temporarily unavailable. Please try again.');
  }
  const constraint = 'constraint' in error ? error.constraint : undefined;
  if (code === '23503' || constraint === 'tasks_configured_limits') {
    return new TaskError('VALIDATION_ERROR', 'Board settings changed. Refresh the board and try again.');
  }
  if (code === '22003') return new TaskError('VERSION_EXHAUSTED', 'This task has reached its update limit.');
  return error;
};
