import type { BoardConfig, Task } from '@task-board/contracts';
export const resolveDropStatus = (task: Task, destination: unknown, config: BoardConfig): string | null => {
  if (typeof destination !== 'string' || destination === task.statusId) return null;
  return config.statuses.some(status => status.id === destination) ? destination : null;
};
