import { QueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast'; // You'll need to install this package

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      onError: (error: unknown) => {
        console.error('Mutation error:', error);
        toast.error('An error occurred while updating data');
      },
    },
  },
});

// Add global query error handler
queryClient.setQueryDefaults(['*'], {
  onError: (error: unknown) => {
    console.error('Query error:', error);
    toast.error('An error occurred while fetching data');
  },
}); 