import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'react-hot-toast'; // You'll need to install this package

const queryCache = new QueryCache({
  onError: (error: unknown) => {
    console.error('Query error:', error);
    if (error instanceof Error) {
      toast.error(error.message || 'An error occurred while fetching data');
    } else {
      toast.error('An error occurred while fetching data');
    }
  },
});

const mutationCache = new MutationCache({
  onError: (error: unknown) => {
    console.error('Mutation error:', error);
    if (error instanceof Error) {
      toast.error(error.message || 'An error occurred while updating data');
    } else {
      toast.error('An error occurred while updating data');
    }
  },
});

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes (was cacheTime in v4)
      refetchOnMount: true,
      refetchOnReconnect: true
    },
    mutations: {
      retry: 1,
      // onError is handled in each mutation or globally via QueryCache
    },
  },
}); 