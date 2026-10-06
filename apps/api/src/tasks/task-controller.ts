import type { RequestHandler } from 'express';
import { formatTaskEtag } from '@task-board/contracts';
import type { TaskService } from './task-service.js';
import { parseTaskEtag } from '../http/task-etag.js';
import { serializeTask } from './task-http-serializer.js';
export const createTaskController = (service: TaskService): Record<'create' | 'list' | 'get' | 'replace' | 'delete', RequestHandler> => ({
  create: async (request, response) => {
    const task = await service.create(request.body);
    response.location(`/tasks/${task.id}`).set('ETag', formatTaskEtag(task)).status(201).json({ data: serializeTask(task) });
  },
  list: async (_request, response) => response.json({ data: (await service.list()).map(serializeTask) }),
  get: async (request, response) => {
    const task = await service.get(request.params.id);
    response.set('ETag', formatTaskEtag(task)).json({ data: serializeTask(task) });
  },
  replace: async (request, response) => {
    const id = String(request.params.id);
    const task = await service.replace(id, request.body, parseTaskEtag(request.get('If-Match'), id));
    response.set('ETag', formatTaskEtag(task)).json({ data: serializeTask(task) });
  },
  delete: async (request, response) => {
    const id = String(request.params.id);
    await service.delete(id, parseTaskEtag(request.get('If-Match'), id));
    response.status(204).end();
  },
});
