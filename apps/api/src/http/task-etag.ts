import { idSchema, versionSchema } from '@task-board/contracts';
import { TaskError } from '../errors/task-errors.js';
export const parseTaskEtag = (header: string | undefined, id: string): number => {
  if (header === undefined) throw new TaskError('PRECONDITION_REQUIRED', 'A current task version is required.');
  const match = /^"([0-9a-fA-F-]+):([1-9][0-9]*)"$/.exec(header);
  if (!idSchema.safeParse(id).success || !match || match[1]?.toLowerCase() !== id.toLowerCase()) {
    throw new TaskError('INVALID_ETAG', 'Invalid task version header.');
  }
  const result = versionSchema.safeParse(Number(match[2]));
  if (!result.success) throw new TaskError('INVALID_ETAG', 'Invalid task version header.');
  return result.data;
};
