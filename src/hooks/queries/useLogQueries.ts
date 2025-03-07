import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface LogOptions {
  namespace?: string;
  podName?: string;
  containerName?: string;
  tailLines?: number;
  follow?: boolean;
}

export const useLogQueries = () => {
  // Get general logs
  const useLogs = (options?: LogOptions) => {
    return useQuery({
      queryKey: ['logs', options],
      queryFn: async () => {
        const response = await api.get('/api/log', { params: options });
        return response.data;
      },
      enabled: !!options?.namespace && !!options?.podName,
      refetchInterval: options?.follow ? 1000 : false,
    });
  };

  // Get workload-specific logs
  const useWorkloadLogs = (options?: LogOptions) => {
    return useQuery({
      queryKey: ['workload-logs', options],
      queryFn: async () => {
        const response = await api.get('/api/wds/logs', { params: options });
        return response.data;
      },
      enabled: !!options?.namespace && !!options?.podName,
      refetchInterval: options?.follow ? 1000 : false,
    });
  };

  return {
    useLogs,
    useWorkloadLogs,
  };
}; 