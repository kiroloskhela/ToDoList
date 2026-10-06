import { Router, type RequestHandler } from 'express';
import { TaskError } from '../errors/task-errors.js';
import type { TaskService } from './task-service.js';
import { createTaskController } from './task-controller.js';
export const createTaskRoutes = (service: TaskService, writeLimiter: RequestHandler) => {
  const router = Router();
  const controller = createTaskController(service);
  router.use((request, response, next) => {
    if (Object.keys(request.query).length) throw new TaskError('VALIDATION_ERROR', 'Query parameters are not supported.');
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      if (request.method !== 'DELETE' && !request.is('application/json')) {
        response.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Use application/json.', requestId: response.locals.requestId } });
        return;
      }
      writeLimiter(request, response, next); return;
    }
    next();
  });
  router.route('/').get(controller.list).post(controller.create).all((_request, response) =>
    response.set('Allow', 'GET, HEAD, POST').status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.', requestId: response.locals.requestId } }));
  router.route('/:id').get(controller.get).put(controller.replace).delete(controller.delete).all((_request, response) =>
    response.set('Allow', 'GET, HEAD, PUT, DELETE').status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.', requestId: response.locals.requestId } }));
  return router;
};
