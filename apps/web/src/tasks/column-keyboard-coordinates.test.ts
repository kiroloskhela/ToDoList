import { expect, it } from 'vitest';
import { columnKeyboardCoordinates } from './column-keyboard-coordinates';
import { statusA, statusB } from '../test/fixtures';
import type { KeyboardCoordinateGetter } from '@dnd-kit/core';
const rectangle = (left: number, top = 0) => ({ left, top, width: 100, height: 200, right: left + 100, bottom: top + 200 });
const options = (current = statusA) => ({ currentCoordinates: { x: 0, y: 0 }, context: {
  over: { id: current }, active: { data: { current: { statusId: statusA } }, rect: { current: { translated: rectangle(0) } } },
  droppableContainers: { getEnabled: () => [{ id: statusB }, { id: statusA }, { id: 'unmeasured' }] },
  droppableRects: new Map([[statusA, rectangle(0)], [statusB, rectangle(150)]]),
} }) as unknown as Parameters<KeyboardCoordinateGetter>[1];
it('keyboard dragging follows measured column order including empty columns', () => {
  expect(columnKeyboardCoordinates(new KeyboardEvent('keydown', { code: 'ArrowRight' }), options())).toEqual({ x: 150, y: 0 });
  expect(columnKeyboardCoordinates(new KeyboardEvent('keydown', { code: 'ArrowLeft' }), options(statusB))).toEqual({ x: 0, y: 0 });
});
it.each(['Escape', 'ArrowLeft'])('ignores unsupported movement or the first-column boundary: %s', code => {
  expect(columnKeyboardCoordinates(new KeyboardEvent('keydown', { code }), options())).toBeUndefined();
});
