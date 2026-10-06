import { beforeAll, afterAll, afterEach, expect, it } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { TaskBoardPage } from './TaskBoardPage';
import { config, makeTask } from '../test/fixtures';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers()); afterAll(() => server.close());
const renderBoard = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><TaskBoardPage/></QueryClientProvider>);
it('creates in a chosen column, searches descriptions, edits and deletes through the board', async () => {
  let tasks = [makeTask()]; const user = userEvent.setup();
  server.use(http.get('*/api/board-config', () => HttpResponse.json({ data: config })), http.get('*/api/tasks', () => HttpResponse.json({ data: tasks })),
    http.post('*/api/tasks', async ({ request }) => { const fields = await request.json() as Record<string, string>; const task = makeTask({ ...fields, id: '55555555-5555-4555-8555-555555555555' }); tasks = [...tasks, task]; return HttpResponse.json({ data: task }, { status: 201 }); }),
    http.put('*/api/tasks/:id', async ({ request, params }) => { const fields = await request.json() as Record<string, string>; const task = { ...tasks.find(task => task.id === params.id)!, ...fields, version: 2 }; tasks = tasks.map(old => old.id === task.id ? task : old); return HttpResponse.json({ data: task }); }),
    http.delete('*/api/tasks/:id', ({ params }) => { tasks = tasks.filter(task => task.id !== params.id); return new HttpResponse(null, { status: 204 }); }));
  renderBoard(); await screen.findByRole('button', { name: 'New task' });
  await user.click(screen.getByRole('button', { name: 'Add task to Finished' }));
  await user.type(screen.getByLabelText(/Task title/), 'Fresh task'); await user.type(screen.getByLabelText(/Description/), 'Unique context');
  await user.click(screen.getByRole('button', { name: 'Create task', exact: true }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(within(screen.getByRole('region', { name: 'Finished' })).getByRole('article', { name: 'Fresh task' })).toBeVisible();
  await user.type(screen.getByLabelText('Search tasks'), 'Unique context'); expect(screen.queryByRole('article', { name: 'Write brief' })).not.toBeInTheDocument();
  await user.clear(screen.getByLabelText('Search tasks'));
  await user.click(screen.getByRole('button', { name: 'Edit Fresh task' })); await user.clear(screen.getByLabelText(/Task title/)); await user.type(screen.getByLabelText(/Task title/), 'Edited task');
  await user.click(screen.getByRole('button', { name: 'Save changes' })); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await user.click(screen.getByRole('button', { name: 'Delete Edited task' })); await user.click(screen.getByRole('button', { name: 'Keep task' }));
  expect(screen.getByRole('article', { name: 'Edited task' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Delete Edited task' })); await user.click(screen.getByRole('button', { name: 'Delete task', exact: true }));
  await waitFor(() => expect(screen.queryByRole('article', { name: 'Edited task' })).not.toBeInTheDocument());
  await user.click(screen.getByRole('button', { name: 'Dismiss notification' })); expect(screen.queryByText('Task deleted.')).not.toBeInTheDocument();
});
it('retains usable cards and provides stale-data feedback and retry after refresh failure', async () => {
  const user = userEvent.setup();
  server.use(http.get('*/api/board-config', () => HttpResponse.json({ data: config })), http.get('*/api/tasks', () => HttpResponse.json({ data: [makeTask()] })));
  renderBoard(); await screen.findByRole('article', { name: 'Write brief' });
  server.use(http.get('*/api/tasks', () => HttpResponse.json({ error: { code: 'FAIL', message: 'Refresh unavailable', requestId: 'test' } }, { status: 400 })));
  await user.click(screen.getByRole('button', { name: 'Refresh board' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Your board may be out of date'); expect(screen.getByRole('article', { name: 'Write brief' })).toBeVisible();
  server.use(http.get('*/api/tasks', () => HttpResponse.json({ data: [makeTask()] })));
  await user.click(screen.getByRole('button', { name: 'Retry refresh' })); await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});
it('recovers from an initial configuration error using the visible retry control', async () => {
  const user = userEvent.setup();
  server.use(http.get('*/api/board-config', () => HttpResponse.json({ error: { code: 'FAIL', message: 'Configuration unavailable', requestId: 'test' } }, { status: 400 })));
  renderBoard(); expect(await screen.findByRole('heading', { name: 'We couldn’t load your board.' })).toBeVisible();
  server.use(http.get('*/api/board-config', () => HttpResponse.json({ data: config })), http.get('*/api/tasks', () => HttpResponse.json({ data: [] })));
  await user.click(screen.getByRole('button', { name: 'Try again' })); expect(await screen.findByRole('button', { name: 'New task' })).toBeVisible();
});
