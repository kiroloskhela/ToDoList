import type { KeyboardCoordinateGetter } from '@dnd-kit/core';
export const columnKeyboardCoordinates: KeyboardCoordinateGetter = (event, { context, currentCoordinates }) => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) return undefined;
  event.preventDefault();
  const columns = context.droppableContainers.getEnabled().map(column => ({ column, rect: context.droppableRects.get(column.id) }))
    .filter(entry => entry.rect).sort((a, b) => (a.rect!.top - b.rect!.top) || (a.rect!.left - b.rect!.left));
  const currentId = context.over?.id ?? context.active?.data.current?.statusId;
  const index = columns.findIndex(entry => entry.column.id === currentId);
  const step = ['ArrowRight', 'ArrowDown'].includes(event.code) ? 1 : -1;
  const destination = columns[index + step]?.rect;
  const active = context.active?.rect.current.translated;
  if (!destination || !active) return undefined;
  return { x: currentCoordinates.x + destination.left + destination.width / 2 - active.left - active.width / 2,
    y: currentCoordinates.y + destination.top + destination.height / 2 - active.top - active.height / 2 };
};
