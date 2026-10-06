import type { Task, TaskFields } from './task-types.js';
export interface TaskRepository {
  insert(fields: TaskFields): Promise<Task>;
  list(): Promise<Task[]>;
  findById(id: string): Promise<Task | null>;
  replace(id: string, expectedVersion: number, fields: TaskFields): Promise<Task | null>;
  delete(id: string, expectedVersion: number): Promise<boolean>;
}
