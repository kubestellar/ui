import { useEffect, useRef } from 'react';
import useNetworkErrorStore from '../stores/networkErrorStore';
import { api } from '../lib/api';

const POLLING_INTERVAL = 5000; // Poll every 5 seconds

const useBackendHealthCheck = () => {
  const { isNetworkError } = useNetworkErrorStore();
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isNetworkError) {
      console.log('useBackendHealthCheck: Network error detected, starting polling.');
      // Start polling only if there's a network error
      intervalRef.current = window.setInterval(async () => {
        console.log('useBackendHealthCheck: Polling backend health...');
        try {
          // Make a lightweight request to the health endpoint
          await api.get('/health');
          console.log('useBackendHealthCheck: Backend health check succeeded.');
          // If successful, the Axios interceptor will handle clearing isNetworkError
          // No need to explicitly call setNetworkError(false) here
        } catch (error) {
          // If the health check still fails, log it or do nothing, as the error interceptor
          // will keep the isNetworkError flag true.
          console.error('useBackendHealthCheck: Backend health check failed:', error);
        }
      }, POLLING_INTERVAL);
    } else {
      console.log('useBackendHealthCheck: No network error, stopping polling.');
      // Clear interval if no network error
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        console.log('useBackendHealthCheck: Cleaning up interval on unmount.');
        window.clearInterval(intervalRef.current);
      }
    };
  }, [isNetworkError]);
};

export default useBackendHealthCheck;
