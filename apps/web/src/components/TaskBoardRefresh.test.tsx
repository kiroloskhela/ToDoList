import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { TaskBoardPage } from './TaskBoardPage';
import { config, deferred, makeTask } from '../test/fixtures';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('locks refresh and stale retry while a column move is saving, preserving the optimistic card', async () => {
  const user = userEvent.setup();
  const save = deferred<void>();
  let currentTask = makeTask();
  let taskReads = 0;
  let configReads = 0;
  let failRefresh = false;
  server.use(
    http.get('*/api/board-config', () => { configReads++; return failRefresh ? HttpResponse.json({ error: { code: 'FAIL', message: 'Refresh unavailable', requestId: 'test' } }, { status: 400 }) : HttpResponse.json({ data: config }); }),
    http.get('*/api/tasks', () => {
      taskReads++;
      return failRefresh ? HttpResponse.json({ error: { code: 'FAIL', message: 'Refresh unavailable', requestId: 'test' } }, { status: 400 }) : HttpResponse.json({ data: [currentTask] });
    }),
    http.put('*/api/tasks/:id', async ({ request }) => {
      const fields = await request.json() as Record<string, string>;
      await save.promise;
      currentTask = { ...currentTask, ...fields, version: 2 };
      return HttpResponse.json({ data: currentTask });
    }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(<QueryClientProvider client={client}><TaskBoardPage/></QueryClientProvider>);
  await screen.findByRole('article', { name: 'Write brief' });
  failRefresh = true;
  await user.click(screen.getByRole('button', { name: 'Refresh board' }));
  await screen.findByRole('button', { name: 'Retry refresh' });
  await user.click(screen.getByRole('combobox', { name: 'Move Write brief to column' }));
  await user.click(screen.getByRole('option', { name: 'Finished' }));
  expect(within(screen.getByRole('region', { name: 'Finished' })).getByRole('article', { name: 'Write brief' })).toBeVisible();
  const refresh = screen.getByRole('button', { name: 'Refresh board' });
  const retry = screen.getByRole('button', { name: 'Retry refresh' });
  expect(refresh).toBeDisabled();
  expect(retry).toBeDisabled();
  const readsBeforeClicks = [taskReads, configReads];
  await user.click(refresh);
  await user.click(retry);
  expect([taskReads, configReads]).toEqual(readsBeforeClicks);
  failRefresh = false;
  save.resolve();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh board' })).toBeEnabled());
  expect(screen.queryByRole('button', { name: 'Retry refresh' })).not.toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Finished' })).getByRole('article', { name: 'Write brief' })).toBeVisible();
  expect(taskReads).toBeGreaterThan(readsBeforeClicks[0]!);
});
