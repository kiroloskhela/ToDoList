import type { Task } from './task-types.js';
export interface TaskRow { id: string; title: string; description: string; status_id: string; priority_id: string; version: number; created_at: Date; updated_at: Date }
export const mapTaskRow = (row: TaskRow): Task => ({
  id: row.id, title: row.title, description: row.description, statusId: row.status_id,
  priorityId: row.priority_id, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at,
});
