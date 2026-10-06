import type { Task as TaskResponse } from '@task-board/contracts';
export type Task = Omit<TaskResponse, 'createdAt' | 'updatedAt'> & { createdAt: Date; updatedAt: Date };
export type { TaskFields } from '@task-board/contracts';
