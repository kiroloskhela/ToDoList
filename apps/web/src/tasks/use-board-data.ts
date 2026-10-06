import { useQuery } from '@tanstack/react-query';
import { taskApi } from '../api/task-api';
import { ApiError } from '../api/http-client';
export const taskQueryKey = ['tasks'] as const;
export const configQueryKey = ['board-config'] as const;
const retry = (attempt: number, error: Error) => attempt < 1 && error instanceof ApiError && (error.status === 0 || error.status >= 500);
export const useBoardData = () => {
  const configuration = useQuery({ queryKey: configQueryKey, queryFn: ({ signal }) => taskApi.configuration(signal), retry, refetchOnWindowFocus: false, refetchOnReconnect: false });
  const tasks = useQuery({ queryKey: taskQueryKey, queryFn: ({ signal }) => taskApi.list(signal), enabled: Boolean(configuration.data), retry, refetchOnWindowFocus: false, refetchOnReconnect: false });
  return { configuration, tasks };
};
