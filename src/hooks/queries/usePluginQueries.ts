import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  PluginService,
  LoadPluginFromGitHubRequest,
  LoadPluginFromFileRequest,
} from '../../services/pluginService';

export const usePluginQueries = () => {
  const queryClient = useQueryClient();

  // Get all loaded plugins
  const usePlugins = () => {
    return useQuery({
      queryKey: ['plugins'],
      queryFn: () => PluginService.listPlugins(),
      staleTime: 1000 * 60, // 1 minute
      refetchInterval: 1000 * 30, // Auto-refresh every 30 seconds
      select: data => ({
        plugins: Object.values(data.plugins),
        count: data.count,
        pluginsMap: data.plugins,
      }),
    });
  };

  // Get specific plugin details
  const usePluginDetails = (pluginId: string) => {
    return useQuery({
      queryKey: ['plugin-details', pluginId],
      queryFn: () => PluginService.getPlugin(pluginId),
      enabled: !!pluginId,
      staleTime: 1000 * 60,
    });
  };

  // Get plugin health status
  const usePluginHealth = (pluginId: string) => {
    return useQuery({
      queryKey: ['plugin-health', pluginId],
      queryFn: () => PluginService.getPluginHealth(pluginId),
      enabled: !!pluginId,
      refetchInterval: 1000 * 10, // Check health every 10 seconds
      retry: false, // Don't retry on health check failures
    });
  };

  // Discover available plugins
  const useAvailablePlugins = () => {
    return useQuery({
      queryKey: ['available-plugins'],
      queryFn: () => PluginService.discoverPlugins(),
      staleTime: 1000 * 60 * 5, // 5 minutes
      select: data => data.available,
    });
  };

  // Load plugin from GitHub
  const useLoadPluginFromGitHub = () => {
    return useMutation({
      mutationFn: (request: LoadPluginFromGitHubRequest) =>
        PluginService.loadPluginFromGitHub(request),
      onSuccess: data => {
        queryClient.invalidateQueries({ queryKey: ['plugins'] });
        toast.success(`Plugin loaded successfully from ${data.repoUrl}`);
        console.log('Plugin loaded from GitHub:', data);
      },
      onError: (error: Error) => {
        toast.error(`Failed to load plugin: ${error.message}`);
        console.error('Error loading plugin from GitHub:', error);
      },
    });
  };

  // Load plugin from local file
  const useLoadPluginFromFile = () => {
    return useMutation({
      mutationFn: (request: LoadPluginFromFileRequest) => PluginService.loadPluginFromFile(request),
      onSuccess: data => {
        queryClient.invalidateQueries({ queryKey: ['plugins'] });
        toast.success(`Plugin loaded successfully from ${data.pluginPath}`);
        console.log('Plugin loaded from file:', data);
      },
      onError: (error: Error) => {
        toast.error(`Failed to load plugin: ${error.message}`);
        console.error('Error loading plugin from file:', error);
      },
    });
  };

  // Unload plugin
  const useUnloadPlugin = () => {
    return useMutation({
      mutationFn: (pluginId: string) => PluginService.unloadPlugin(pluginId),
      onSuccess: data => {
        queryClient.invalidateQueries({ queryKey: ['plugins'] });
        queryClient.removeQueries({ queryKey: ['plugin-details', data.pluginId] });
        queryClient.removeQueries({ queryKey: ['plugin-health', data.pluginId] });
        toast.success(`Plugin ${data.pluginId} unloaded successfully`);
        console.log('Plugin unloaded:', data);
      },
      onError: (error: Error) => {
        toast.error(`Failed to unload plugin: ${error.message}`);
        console.error('Error unloading plugin:', error);
      },
    });
  };

  // Generic plugin endpoint caller
  const useCallPluginEndpoint = () => {
    return useMutation({
      mutationFn: ({
        pluginId,
        endpoint,
        method = 'GET',
        data,
      }: {
        pluginId: string;
        endpoint: string;
        method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
        data?: Record<string, unknown>;
      }) => PluginService.callPluginEndpoint(pluginId, endpoint, method, data),
      onError: (error: Error) => {
        toast.error(`Plugin API call failed: ${error.message}`);
        console.error('Plugin API call error:', error);
      },
    });
  };

  return {
    usePlugins,
    usePluginDetails,
    usePluginHealth,
    useAvailablePlugins,
    useLoadPluginFromGitHub,
    useLoadPluginFromFile,
    useUnloadPlugin,
    useCallPluginEndpoint,
  };
};
