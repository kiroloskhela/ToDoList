import type { Task } from '@task-board/contracts';
export const replaceCachedTask = (tasks: Task[], replacement: Task) => tasks.map(task => task.id === replacement.id ? replacement : task);
export const removeCachedTask = (tasks: Task[], id: string) => tasks.filter(task => task.id !== id);
export const taskFields = (task: Task) => ({ title: task.title, description: task.description, statusId: task.statusId, priorityId: task.priorityId });
