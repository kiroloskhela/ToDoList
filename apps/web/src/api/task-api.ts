import { configEnvelopeSchema, taskEnvelopeSchema, tasksEnvelopeSchema, formatTaskEtag, type Task, type TaskFields } from '@task-board/contracts';
import { request } from './http-client';
const jsonHeaders = { 'Content-Type': 'application/json' };
export const taskApi = {
  configuration: async (signal?: AbortSignal) => (await request('/board-config', configEnvelopeSchema, { signal })).data,
  list: async (signal?: AbortSignal) => (await request('/tasks', tasksEnvelopeSchema, { signal })).data,
  create: async (fields: TaskFields) => (await request('/tasks', taskEnvelopeSchema, { method: 'POST', headers: jsonHeaders, body: JSON.stringify(fields) })).data,
  replace: async (task: Task, fields: TaskFields) => (await request(`/tasks/${task.id}`, taskEnvelopeSchema, {
    method: 'PUT', headers: { ...jsonHeaders, 'If-Match': formatTaskEtag(task) }, body: JSON.stringify(fields),
  })).data,
  delete: async (task: Task) => { await request<void>(`/tasks/${task.id}`, null, { method: 'DELETE', headers: { 'If-Match': formatTaskEtag(task) } }); },
};
