import { createTaskSchemas, idSchema, versionSchema } from '@task-board/contracts';
import type { ZodType } from 'zod';
import type { BoardConfigRepository } from '../board/board-config-repository.js';
import { TaskError, type ErrorCode } from '../errors/task-errors.js';
import type { TaskRepository } from './task-repository.js';

const parse = <T>(schema: ZodType<T>, input: unknown, code: ErrorCode = 'VALIDATION_ERROR'): T => {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fields: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.join('.') || 'body';
    (fields[field] ??= []).push(issue.message);
  }
  throw new TaskError(code, 'Please check your input.', fields);
};
export const createTaskService = (repository: TaskRepository, configuration: BoardConfigRepository) => {
  const classifyMissingWrite = async (id: string): Promise<never> => {
    if (!await repository.findById(id)) throw new TaskError('TASK_NOT_FOUND', 'This task no longer exists.');
    throw new TaskError('PRECONDITION_FAILED', 'This task changed elsewhere. Refresh before saving again.');
  };
  return {
    create: async (input: unknown) => repository.insert(parse(createTaskSchemas(await configuration.get()).create, input)),
    list: () => repository.list(),
    get: async (inputId: unknown) => {
      const id = parse(idSchema, inputId, 'INVALID_ID');
      const task = await repository.findById(id);
      if (!task) throw new TaskError('TASK_NOT_FOUND', 'This task no longer exists.');
      return task;
    },
    replace: async (inputId: unknown, input: unknown, expectedVersion: unknown) => {
      const id = parse(idSchema, inputId, 'INVALID_ID');
      const version = parse(versionSchema, expectedVersion, 'INVALID_VERSION');
      const fields = parse(createTaskSchemas(await configuration.get()).replace, input);
      const task = await repository.replace(id, version, fields);
      return task ?? classifyMissingWrite(id);
    },
    delete: async (inputId: unknown, expectedVersion: unknown) => {
      const id = parse(idSchema, inputId, 'INVALID_ID');
      const version = parse(versionSchema, expectedVersion, 'INVALID_VERSION');
      if (!await repository.delete(id, version)) await classifyMissingWrite(id);
    },
  };
};
export type TaskService = ReturnType<typeof createTaskService>;
