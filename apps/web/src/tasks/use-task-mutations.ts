import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task, TaskFields } from '@task-board/contracts';
import { taskApi } from '../api/task-api';
import { ApiError } from '../api/http-client';
import { removeCachedTask, replaceCachedTask } from './board-cache';
import { configQueryKey, taskQueryKey } from './use-board-data';

export type TaskCommand = { kind: 'create'; fields: TaskFields } |
  { kind: 'replace'; task: Task; fields: TaskFields } | { kind: 'delete'; task: Task };
export type Feedback = { kind: 'success' | 'error'; message: string };
const persist = async (command: TaskCommand): Promise<Task | null> => {
  if (command.kind === 'create') return taskApi.create(command.fields);
  if (command.kind === 'replace') return taskApi.replace(command.task, command.fields);
  await taskApi.delete(command.task); return null;
};
export const useTaskMutations = () => {
  const client = useQueryClient();
  const locks = useRef(new Set<string>());
  const [pendingIds, setPendingIds] = useState(new Set<string>());
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const mutation = useMutation({ mutationFn: persist, retry: false,
    onMutate: async command => {
      await client.cancelQueries({ queryKey: taskQueryKey });
      if (command.kind !== 'replace') return undefined;
      const previous = client.getQueryData<Task[]>(taskQueryKey)?.find(task => task.id === command.task.id);
      client.setQueryData<Task[]>(taskQueryKey, tasks => replaceCachedTask(tasks ?? [], { ...command.task, ...command.fields }));
      return previous;
    },
    onSuccess: (task, command) => {
      client.setQueryData<Task[]>(taskQueryKey, tasks => {
        if (command.kind === 'delete') return removeCachedTask(tasks ?? [], command.task.id);
        if (!task) return tasks;
        return command.kind === 'create' ? [...(tasks ?? []), task] : replaceCachedTask(tasks ?? [], task);
      });
      const messages = { create: 'Task created. Make it a good one.', replace: 'Changes saved.', delete: 'Task deleted.' };
      setFeedback({ kind: 'success', message: messages[command.kind] });
    },
    onError: (error, command, previous) => {
      if (command.kind === 'replace' && previous) client.setQueryData<Task[]>(taskQueryKey, tasks => replaceCachedTask(tasks ?? [], previous));
      setFeedback({ kind: 'error', message: error.message });
    },
  });
  const execute = async (command: TaskCommand) => {
    const id = command.kind === 'create' ? 'create' : command.task.id;
    if (locks.current.has(id)) throw new ApiError('This task is still saving.', 409, 'TASK_PENDING');
    locks.current.add(id); setPendingIds(new Set(locks.current));
    try { return await mutation.mutateAsync(command); }
    finally {
      locks.current.delete(id); setPendingIds(new Set(locks.current));
      if (!locks.current.size) await Promise.all([
        client.invalidateQueries({ queryKey: taskQueryKey }), client.invalidateQueries({ queryKey: configQueryKey }),
      ]);
    }
  };
  return { execute, pendingIds, feedback, clearFeedback: () => setFeedback(null) };
};
