import { errorEnvelopeSchema } from '@task-board/contracts';
import type { ZodType } from 'zod';
export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string,
    public readonly fields?: Record<string, string[]>) { super(message); this.name = 'ApiError'; }
}
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';
export const request = async <T>(path: string, schema: ZodType<T> | null, options: RequestInit = {}): Promise<T> => {
  const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(6000)]) : AbortSignal.timeout(6000);
  let response: Response;
  try { response = await fetch(`${baseUrl}${path}`, { ...options, signal }); }
  catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError('Connection interrupted. Refresh the board to check the outcome before retrying.', 0, 'NETWORK_ERROR');
  }
  if (response.status === 204) return undefined as T;
  let json: unknown;
  try { json = await response.json(); } catch { throw new ApiError('The server returned an unreadable response.', response.status, 'INVALID_RESPONSE'); }
  if (!response.ok) {
    const failure = errorEnvelopeSchema.safeParse(json);
    if (!failure.success) throw new ApiError('The request could not be completed.', response.status, 'HTTP_ERROR');
    throw new ApiError(failure.data.error.message, response.status, failure.data.error.code, failure.data.error.fields);
  }
  const parsed = schema?.safeParse(json);
  if (!parsed?.success) throw new ApiError('The server returned an invalid response.', response.status, 'INVALID_RESPONSE');
  return parsed.data;
};
