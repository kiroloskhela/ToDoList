import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteTaskDialog } from './DeleteTaskDialog';
import { config, makeTask } from '../test/fixtures';
it('retains the confirmation and task details after deletion fails', async () => {
  const onClose = vi.fn(); const user = userEvent.setup();
  render(<DeleteTaskDialog config={config} task={makeTask()} pending={false} onClose={onClose} onDelete={() => Promise.reject(new Error('Delete unavailable'))}/>);
  await user.click(screen.getByRole('button', { name: 'Delete task', exact: true }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Delete unavailable'); expect(screen.getByText(/Write brief/)).toBeVisible(); expect(onClose).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Keep task' })); expect(onClose).toHaveBeenCalledOnce();
});
