import { beforeAll, afterEach, afterAll, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { taskApi } from './task-api';
const server = setupServer(); beforeAll(() => server.listen({ onUnhandledRequest: 'error' })); afterEach(() => server.resetHandlers()); afterAll(() => server.close());
it.each([
  ['invalid JSON', () => new HttpResponse('{', { status: 200 }), 'INVALID_RESPONSE'],
  ['invalid successful payload', () => HttpResponse.json({ data: [{ id: 'not-a-task' }] }), 'INVALID_RESPONSE'],
  ['unrecognized error envelope', () => HttpResponse.json({ message: 'Bad' }, { status: 403 }), 'HTTP_ERROR'],
  ['connection failure', () => HttpResponse.error(), 'NETWORK_ERROR'],
])('reports %s without accepting unusable task data', async (_scenario, response, code) => {
  server.use(http.get('*/api/tasks', response)); await expect(taskApi.list()).rejects.toMatchObject({ code });
});
it('preserves server field errors for the form to display', async () => {
  server.use(http.post('*/api/tasks', () => HttpResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Check title', requestId: 'test', fields: { title: ['Too long'] } } }, { status: 422 })));
  await expect(taskApi.create({ title: 'Draft', description: '', statusId: '11111111-1111-4111-8111-111111111111', priorityId: '33333333-3333-4333-8333-333333333333' })).rejects.toMatchObject({ status: 422, fields: { title: ['Too long'] } });
});
