import type { Task } from '@task-board/contracts';
export type BoardDialog = { kind: 'closed' } | { kind: 'create'; statusId?: string } | { kind: 'edit' | 'delete'; task: Task };
export type DialogAction = { type: 'close' } | { type: 'create'; statusId?: string } | { type: 'edit' | 'delete'; task: Task };
export const boardDialogReducer = (_state: BoardDialog, action: DialogAction): BoardDialog => {
  if (action.type === 'close') return { kind: 'closed' };
  if (action.type === 'create') return { kind: 'create', statusId: action.statusId };
  return { kind: action.type, task: action.task };
};
