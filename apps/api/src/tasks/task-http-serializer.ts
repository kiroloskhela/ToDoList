import type { Task } from './task-types.js';
export const serializeTask = (task: Task) => ({ ...task, createdAt: task.createdAt.toISOString(), updatedAt: task.updatedAt.toISOString() });
