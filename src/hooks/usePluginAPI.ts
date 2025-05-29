import { useCallback } from 'react';
import { usePluginQueries } from './queries/usePluginQueries';

export const usePluginAPI = () => {
  const { useCallPluginEndpoint } = usePluginQueries();
  const callEndpoint = useCallPluginEndpoint();

  // Generic plugin API caller with better error handling
  const callPlugin = useCallback(
    async (
      pluginId: string,
      endpoint: string,
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
      data?: Record<string, unknown>,
      options?: {
        silent?: boolean; // Don't show toast notifications
        timeout?: number;
      }
    ) => {
      try {
        const result = await callEndpoint.mutateAsync({
          pluginId,
          endpoint,
          method,
          data,
        });
        return result;
      } catch (error) {
        if (!options?.silent) {
          console.error(`Plugin ${pluginId} API call failed:`, error);
        }
        throw error;
      }
    },
    [callEndpoint]
  );

  // Specialized cluster plugin calls
  const clusterPlugin = {
    onboard: useCallback(
      async (clusterName: string, kubeconfig?: string) => {
        return callPlugin('kubestellar-cluster-plugin', '/onboard', 'POST', {
          clusterName,
          kubeconfig,
        });
      },
      [callPlugin]
    ),

    detach: useCallback(
      async (clusterName: string) => {
        return callPlugin('kubestellar-cluster-plugin', '/detach', 'POST', {
          clusterName,
        });
      },
      [callPlugin]
    ),

    getStatus: useCallback(async () => {
      return callPlugin('kubestellar-cluster-plugin', '/status', 'GET', undefined, {
        silent: true,
      });
    }, [callPlugin]),
  };

  return {
    callPlugin,
    clusterPlugin,
    isLoading: callEndpoint.isPending,
    error: callEndpoint.error,
  };
};
