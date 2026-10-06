import { describe, expect, it } from 'vitest';
import { replaceCachedTask, removeCachedTask } from './board-cache';
import { resolveDropStatus } from './resolve-drop-status';
import { boardDialogReducer } from './board-dialog-reducer';
import { config, makeTask, statusA, statusB } from '../test/fixtures';
describe('board state', () => {
  it('replaces or removes one task while retaining unrelated server changes', () => {
    const task = makeTask(); const other = makeTask({ id: '55555555-5555-4555-8555-555555555555', version: 4, title: 'Latest' });
    expect(replaceCachedTask([task, other], { ...task, statusId: statusB })).toEqual([{ ...task, statusId: statusB }, other]);
    expect(removeCachedTask([task, other], task.id)).toEqual([other]);
  });
  it.each([undefined, 1, 'unknown', statusA])('ignores invalid or unchanged drop destination %s', destination => {
    expect(resolveDropStatus(makeTask(), destination, config)).toBeNull();
  });
  it('accepts a configured destination and discards obsolete dialog state', () => {
    const task = makeTask();
    expect(resolveDropStatus(task, statusB, config)).toBe(statusB);
    const edit = boardDialogReducer({ kind: 'closed' }, { type: 'edit', task });
    expect(edit).toEqual({ kind: 'edit', task });
    expect(boardDialogReducer(edit, { type: 'create', statusId: statusB })).toEqual({ kind: 'create', statusId: statusB });
    expect(boardDialogReducer(edit, { type: 'close' })).toEqual({ kind: 'closed' });
  });
});
