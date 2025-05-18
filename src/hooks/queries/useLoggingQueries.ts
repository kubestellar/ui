import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const useLoggingQueries = () => {
  const useLogs = () =>
    useQuery({
      queryKey: ['logs'],
      queryFn: async () => {
        const response = await api.get('/api/log');
        return response.data;
      },
      gcTime: 5 * 60 * 1000,
      staleTime: 30 * 1000,
    });

  return { useLogs };
};
