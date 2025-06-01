/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  PluginService,
  LoadPluginFromGitHubRequest,
  LoadPluginFromFileRequest,
  GitHubInstallRequest,
  GitHubUpdateRequest,
} from '../../services/pluginService';

export const usePluginQueries = () => {
  const queryClient = useQueryClient();

  // CORE PLUGIN MANAGEMENT HOOKS

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

  const usePluginDetails = (pluginId: string) => {
    return useQuery({
      queryKey: ['plugin-details', pluginId],
      queryFn: () => PluginService.getPlugin(pluginId),
      enabled: !!pluginId,
      staleTime: 1000 * 60,
    });
  };

  const usePluginHealth = (pluginId: string) => {
    return useQuery({
      queryKey: ['plugin-health', pluginId],
      queryFn: () => PluginService.getPluginHealth(pluginId),
      enabled: !!pluginId,
      refetchInterval: 1000 * 10, // Check health every 10 seconds
      retry: false, // Don't retry on health check failures
    });
  };

  const useAvailablePlugins = () => {
    return useQuery({
      queryKey: ['available-plugins'],
      queryFn: () => PluginService.discoverPlugins(),
      staleTime: 1000 * 60 * 5, // 5 minutes
      select: data => data.available,
    });
  };

  // PLUGIN LOADING & UNLOADING MUTATIONS

  const useLoadPluginFromGitHub = () => {
    return useMutation({
      mutationFn: (request: LoadPluginFromGitHubRequest) =>
        PluginService.loadPluginFromGitHub(request),
      onSuccess: data => {
        queryClient.invalidateQueries({ queryKey: ['plugins'] });
        toast.success(`Plugin loaded successfully from ${data.repoUrl || 'repository'}`);
      },
      onError: (error: Error) => {
        toast.error(`Failed to load plugin: ${error.message}`);
        console.error('Error loading plugin from GitHub:', error);
      },
    });
  };

  const useLoadPluginFromFile = () => {
    return useMutation({
      mutationFn: (request: LoadPluginFromFileRequest) => PluginService.loadLocalPlugin(request),
      onSuccess: data => {
        queryClient.invalidateQueries({ queryKey: ['plugins'] });
        toast.success(`Plugin loaded successfully from ${data.pluginPath || 'file'}`);
      },
      onError: (error: Error) => {
        toast.error(`Failed to load plugin: ${error.message}`);
        console.error('Error loading plugin from file:', error);
      },
    });
  };

  const useUnloadPlugin = () => {
    return useMutation({
      mutationFn: (pluginId: string) => PluginService.unloadPlugin(pluginId),
      onSuccess: data => {
        // Invalidate all related queries
        queryClient.invalidateQueries({ queryKey: ['plugins'] });
        queryClient.invalidateQueries({ queryKey: ['local-plugins'] });

        // Remove specific plugin queries
        queryClient.removeQueries({ queryKey: ['plugin-details', data.pluginId] });
        queryClient.removeQueries({ queryKey: ['plugin-health', data.pluginId] });

        toast.success(`Plugin ${data.pluginId} unloaded successfully`);
      },
      onError: (error: Error) => {
        toast.error(`Failed to unload plugin: ${error.message}`);
        console.error('Error unloading plugin:', error);
      },
    });
  };

  // PLUGIN API INTERACTION

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

  // GITHUB REPOSITORY MANAGEMENT (Simplified)

  const useInstallGitHubRepository = () => {
    return useMutation({
      mutationFn: (request: GitHubInstallRequest) => PluginService.installGitHubRepository(request),
      onSuccess: (data: any) => {
        //  FIXED: Added type assertion
        queryClient.invalidateQueries({ queryKey: ['plugins'] });
        toast.success(`Repository installed successfully: ${data.repoUrl || 'repository'}`);
      },
      onError: (error: Error) => {
        toast.error(`Failed to install repository: ${error.message}`);
        console.error('Error installing GitHub repository:', error);
      },
    });
  };

  const useUpdateGitHubRepository = () => {
    return useMutation({
      mutationFn: (request: GitHubUpdateRequest) => PluginService.updateGitHubRepository(request),
      onSuccess: (data: any) => {
        //  FIXED: Added type assertion
        queryClient.invalidateQueries({ queryKey: ['plugins'] });
        toast.success(`Repository updated successfully: ${data.repoUrl || 'repository'}`);
      },
      onError: (error: Error) => {
        toast.error(`Failed to update repository: ${error.message}`);
        console.error('Error updating GitHub repository:', error);
      },
    });
  };

  // LOCAL PLUGIN DEVELOPMENT

  const useLoadLocalPlugin = () => {
    return useMutation({
      mutationFn: (request: LoadPluginFromFileRequest) => PluginService.loadLocalPlugin(request),
      onSuccess: data => {
        queryClient.invalidateQueries({ queryKey: ['plugins'] });
        queryClient.invalidateQueries({ queryKey: ['local-plugins'] });
        toast.success(`Local plugin loaded: ${data.pluginPath || 'plugin'}`);
      },
      onError: (error: Error) => {
        toast.error(`Failed to load local plugin: ${error.message}`);
        console.error('Error loading local plugin:', error);
      },
    });
  };

  const useUnloadLocalPlugin = () => {
    return useMutation({
      mutationFn: (request: { pluginId: string }) =>
        PluginService.unloadLocalPlugin(request.pluginId),
      onSuccess: (data: any) => {
        //  FIXED: Added type assertion
        queryClient.invalidateQueries({ queryKey: ['plugins'] });
        queryClient.invalidateQueries({ queryKey: ['local-plugins'] });
        queryClient.removeQueries({ queryKey: ['plugin-details', data.pluginId] });
        queryClient.removeQueries({ queryKey: ['plugin-health', data.pluginId] });
        toast.success(`Local plugin unloaded: ${data.pluginId || 'plugin'}`);
      },
      onError: (error: Error) => {
        toast.error(`Failed to unload local plugin: ${error.message}`);
        console.error('Error unloading local plugin:', error);
      },
    });
  };

  const useListLocalPlugins = () => {
    return useQuery({
      queryKey: ['local-plugins'],
      queryFn: () => PluginService.listLocalPlugins(),
      staleTime: 1000 * 30, // 30 seconds
      refetchInterval: 1000 * 60, // Auto-refresh every minute
    });
  };

  const useBuildInfo = () => {
    return useQuery({
      queryKey: ['build-info'],
      queryFn: () => PluginService.getBuildInfo(),
      staleTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false, // Don't refetch on window focus
    });
  };

  return {
    // Core Plugin Management
    usePlugins,
    usePluginDetails,
    usePluginHealth,
    useAvailablePlugins,

    // Plugin Loading & Unloading
    useLoadPluginFromGitHub,
    useLoadPluginFromFile,
    useUnloadPlugin,

    // Plugin API Interaction
    useCallPluginEndpoint,

    // GitHub Repository Management (Simplified)
    useInstallGitHubRepository,
    useUpdateGitHubRepository,

    // Local Plugin Development
    useLoadLocalPlugin,
    useUnloadLocalPlugin,
    useListLocalPlugins,
    useBuildInfo,
  };
};
