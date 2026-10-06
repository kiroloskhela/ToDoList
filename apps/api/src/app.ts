import express from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { query, type QueryExecutor } from './database/pool.js';
import { createPgTaskRepository } from './tasks/pg-task-repository.js';
import { createBoardConfigRepository } from './board/board-config-repository.js';
import { createTaskService } from './tasks/task-service.js';
import { createTaskRoutes } from './tasks/task-routes.js';
import { requestId } from './http/request-id.js';
import { errorHandler } from './http/error-handler.js';
import { createRequestLimiter } from './http/rate-limit.js';
export const createApp = (database: QueryExecutor, limits = { general: 300, writes: 60 }) => {
  const app = express();
  const configuration = createBoardConfigRepository(database);
  app.disable('x-powered-by');
  app.use((request, _response, next) => {
    if (request.url.startsWith('/api/')) request.url = request.url.slice(4);
    next();
  });
  app.use(requestId, helmet(), createRequestLimiter(limits.general), express.json({ limit: '32kb', inflate: false }));
  app.get('/health/live', (_request, response) => response.json({ status: 'live', uptime: process.uptime() }));
  app.get('/health/ready', async (_request, response) => { await query(database, 'SELECT 1'); response.json({ status: 'ready' }); });
  app.get('/board-config', async (request, response) => {
    if (Object.keys(request.query).length) { response.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Query parameters are not supported.', requestId: response.locals.requestId } }); return; }
    response.json({ data: await configuration.get() });
  });
  app.use('/tasks', createTaskRoutes(createTaskService(createPgTaskRepository(database), configuration), createRequestLimiter(limits.writes)));
  const webDirectory = resolve(import.meta.dirname, '../../web/dist');
  if (existsSync(webDirectory)) {
    app.use(express.static(webDirectory));
    app.get('/{*splat}', (request, response, next) => {
      if (!request.headers.accept?.includes('text/html')) { next(); return; }
      response.sendFile(resolve(webDirectory, 'index.html'));
    });
  }
  app.use((_request, response) => response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found.', requestId: response.locals.requestId } }));
  app.use(errorHandler);
  return app;
};
