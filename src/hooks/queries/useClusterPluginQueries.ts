import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { PluginService } from '../../services/pluginService';

interface ClusterOnboardRequest {
  clusterName: string;
  kubeconfig?: string;
}

interface ClusterDetachRequest {
  clusterName: string;
}

interface ClusterStatus {
  ClusterName: string;
  Status: string;
}

interface ClusterStatusResponse {
  clusters: ClusterStatus[];
  plugin: string;
}

export const useClusterPluginQueries = () => {
  const PLUGIN_ID = 'kubestellar-cluster-plugin';

  // Check if cluster plugin is available
  const useClusterPluginStatus = () => {
    return useQuery({
      queryKey: ['cluster-plugin-status'],
      queryFn: async () => {
        // First check if plugin is loaded before trying to get details
        const plugins = await PluginService.listPlugins();
        if (!(PLUGIN_ID in plugins.plugins)) {
          return { available: false, version: null, routes: [] };
        }

        // Only if plugin exists, get its details
        const data = await PluginService.getPlugin(PLUGIN_ID);
        return {
          available: true,
          version: data.plugin.Version,
          routes: data.routes,
        };
      },
      retry: false,
      refetchInterval: 1000 * 10, // Check every 10 seconds
      throwOnError: false, // Don't throw errors to avoid console spam
    });
  };

  // Get cluster statuses from plugin
  const useClusterPluginStatuses = () => {
    return useQuery({
      queryKey: ['cluster-plugin-statuses'],
      queryFn: async (): Promise<ClusterStatusResponse> => {
        // First check if plugin is loaded
        const plugins = await PluginService.listPlugins();
        if (!(PLUGIN_ID in plugins.plugins)) {
          throw new Error('Cluster plugin not loaded');
        }

        const data = await PluginService.callPluginEndpoint(PLUGIN_ID, '/status', 'GET');

        // Safe type conversion with proper checking
        const unknownData = data as unknown;
        const typedData = unknownData as ClusterStatusResponse;

        // Type guard and transformation with fallbacks
        return {
          clusters: Array.isArray(typedData.clusters) ? typedData.clusters : [],
          plugin: typeof typedData.plugin === 'string' ? typedData.plugin : PLUGIN_ID,
        };
      },
      enabled: false, // Start disabled - will be enabled conditionally
      refetchInterval: 1000 * 5, // Refresh every 5 seconds
      retry: false,
      select: (data: ClusterStatusResponse) => data.clusters || [],
      throwOnError: false, // Silent fail if plugin not available
    });
  };

  // Onboard cluster via plugin
  const usePluginOnboardCluster = () => {
    return useMutation({
      mutationFn: async (request: ClusterOnboardRequest) => {
        // Check if plugin is loaded before attempting
        const plugins = await PluginService.listPlugins();
        if (!(PLUGIN_ID in plugins.plugins)) {
          throw new Error('Cluster plugin is not loaded');
        }

        const response = await PluginService.callPluginEndpoint(
          PLUGIN_ID,
          '/onboard',
          'POST',
          request as unknown as Record<string, unknown>
        );
        return response;
      },
      onSuccess: data => {
        const unknownData = data as unknown;
        const message =
          (unknownData as { message?: string }).message || 'Cluster onboarding started';
        toast.success(`Cluster onboarding started via plugin: ${message}`);
        console.log('Plugin onboard response:', data);
      },
      onError: (error: Error) => {
        toast.error(`Plugin onboard failed: ${error.message}`);
        console.error('Plugin onboard error:', error);
      },
    });
  };

  // Detach cluster via plugin
  const usePluginDetachCluster = () => {
    return useMutation({
      mutationFn: async (request: ClusterDetachRequest) => {
        // Check if plugin is loaded before attempting
        const plugins = await PluginService.listPlugins();
        if (!(PLUGIN_ID in plugins.plugins)) {
          throw new Error('Cluster plugin is not loaded');
        }

        const response = await PluginService.callPluginEndpoint(
          PLUGIN_ID,
          '/detach',
          'POST',
          request as unknown as Record<string, unknown>
        );
        return response;
      },
      onSuccess: data => {
        const unknownData = data as unknown;
        const message =
          (unknownData as { message?: string }).message || 'Cluster detachment started';
        toast.success(`Cluster detachment started via plugin: ${message}`);
        console.log('Plugin detach response:', data);
      },
      onError: (error: Error) => {
        toast.error(`Plugin detach failed: ${error.message}`);
        console.error('Plugin detach error:', error);
      },
    });
  };

  return {
    useClusterPluginStatus,
    useClusterPluginStatuses,
    usePluginOnboardCluster,
    usePluginDetachCluster,
    PLUGIN_ID,
  };
};
