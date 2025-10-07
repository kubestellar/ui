import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { isOnLoginPage } from '../../utils/routeUtils';

const queryCache = new QueryCache({
  onError: (error: unknown) => {
    console.error('Query error:', error);

    // Don't show toast for login-related errors as they're handled specifically
    if (axios.isAxiosError(error) && error.config?.url?.includes('/login')) {
      console.log('Login query error, handled by login hook');
      return;
    }

    // Don't show raw axios error messages
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401) {
        // Only show authentication toast if user is not already on login page
        if (!isOnLoginPage()) {
          toast.error('Authentication required. Please log in again.');
        }
      } else if (status === 403) {
        toast.error("Access denied. You don't have permission for this action.");
      } else if (status && status >= 500) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error('An error occurred while fetching data');
      }
    } else if (error instanceof Error) {
      // Don't show raw error messages, use generic message instead
      toast.error('An error occurred while fetching data');
    } else {
      toast.error('An error occurred while fetching data');
    }
  },
});

const mutationCache = new MutationCache({
  onError: (error: unknown) => {
    console.error('Mutation error:', error);

    // Don't show toast for login-related errors as they're handled specifically
    if (axios.isAxiosError(error) && error.config?.url?.includes('/login')) {
      console.log('Login mutation error, handled by login hook');
      return;
    }

    // Don't show raw axios error messages
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401) {
        // Only show authentication toast if user is not already on login page
        if (!isOnLoginPage()) {
          toast.error('Authentication required. Please log in again.');
        }
      } else if (status === 403) {
        toast.error("Access denied. You don't have permission for this action.");
      } else if (status && status >= 500) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error('An error occurred while updating data');
      }
    } else if (error instanceof Error) {
      // Don't show raw error messages, use generic message instead
      toast.error('An error occurred while updating data');
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
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      // onError is handled in each mutation or globally via QueryCache
    },
  },
});
