import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { PluginService } from '../services/pluginService';
import type { LoadPluginRequest, PluginConfiguration } from '../types/plugin';

// Query keys
export const pluginKeys = {
  all: ['plugins'] as const,
  lists: () => [...pluginKeys.all, 'list'] as const,
  list: (filters: string) => [...pluginKeys.lists(), { filters }] as const,
  details: () => [...pluginKeys.all, 'detail'] as const,
  detail: (id: string) => [...pluginKeys.details(), id] as const,
  status: (id: string) => [...pluginKeys.all, 'status', id] as const,
  healthSummary: () => [...pluginKeys.all, 'health-summary'] as const,
  systemMetrics: () => [...pluginKeys.all, 'system-metrics'] as const,
  configuration: () => [...pluginKeys.all, 'configuration'] as const,
  cache: () => [...pluginKeys.all, 'cache'] as const,
  available: () => [...pluginKeys.all, 'available'] as const,
};

// Custom hooks
export function usePlugins() {
  return useQuery({
    queryKey: pluginKeys.lists(),
    queryFn: PluginService.listPlugins,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function usePlugin(id: string) {
  return useQuery({
    queryKey: pluginKeys.detail(id),
    queryFn: () => PluginService.getPlugin(id),
    enabled: !!id,
    staleTime: 10000,
  });
}

export function usePluginStatus(id: string) {
  return useQuery({
    queryKey: pluginKeys.status(id),
    queryFn: () => PluginService.getPluginStatus(id),
    enabled: !!id,
    refetchInterval: 5000, // Frequent updates for status
    staleTime: 1000,
  });
}

export function useHealthSummary() {
  return useQuery({
    queryKey: pluginKeys.healthSummary(),
    queryFn: PluginService.getHealthSummary,
    refetchInterval: 10000,
    staleTime: 5000,
  });
}

export function useSystemMetrics() {
  return useQuery({
    queryKey: pluginKeys.systemMetrics(),
    queryFn: PluginService.getSystemMetrics,
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function usePluginConfiguration() {
  return useQuery({
    queryKey: pluginKeys.configuration(),
    queryFn: PluginService.getConfiguration,
    staleTime: 60000, // Configuration changes less frequently
  });
}

export function useCacheInfo() {
  return useQuery({
    queryKey: pluginKeys.cache(),
    queryFn: PluginService.getCacheInfo,
    staleTime: 30000,
  });
}

export function useAvailablePlugins() {
  return useQuery({
    queryKey: pluginKeys.available(),
    queryFn: PluginService.getAvailablePlugins,
    staleTime: 300000, // Cache for 5 minutes
  });
}

// Mutation hooks
export function useLoadPlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: LoadPluginRequest) => PluginService.loadPlugin(request),
    onSuccess: plugin => {
      toast.success(`Plugin "${plugin.metadata.name}" loaded successfully`);
      queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pluginKeys.systemMetrics() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to load plugin: ${error.message}`);
    },
  });
}

export function useUnloadPlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => PluginService.unloadPlugin(id),
    onSuccess: (_, id) => {
      toast.success('Plugin unloaded successfully');
      queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
      queryClient.removeQueries({ queryKey: pluginKeys.detail(id) });
      queryClient.removeQueries({ queryKey: pluginKeys.status(id) });
      queryClient.invalidateQueries({ queryKey: pluginKeys.systemMetrics() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to unload plugin: ${error.message}`);
    },
  });
}

export function useReloadPlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => PluginService.reloadPlugin(id),
    onSuccess: plugin => {
      toast.success(`Plugin "${plugin.metadata.name}" reloaded successfully`);
      queryClient.invalidateQueries({ queryKey: pluginKeys.detail(plugin.metadata.id) });
      queryClient.invalidateQueries({ queryKey: pluginKeys.status(plugin.metadata.id) });
      queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to reload plugin: ${error.message}`);
    },
  });
}

export function useUpdatePlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, config }: { id: string; config?: Record<string, unknown> }) =>
      PluginService.updatePlugin(id, config),
    onSuccess: plugin => {
      toast.success(`Plugin "${plugin.metadata.name}" updated successfully`);
      queryClient.invalidateQueries({ queryKey: pluginKeys.detail(plugin.metadata.id) });
      queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update plugin: ${error.message}`);
    },
  });
}

export function useEnablePlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => PluginService.enablePlugin(id),
    onSuccess: (_, id) => {
      toast.success('Plugin enabled successfully');
      queryClient.invalidateQueries({ queryKey: pluginKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: pluginKeys.status(id) });
      queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to enable plugin: ${error.message}`);
    },
  });
}

export function useDisablePlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => PluginService.disablePlugin(id),
    onSuccess: (_, id) => {
      toast.success('Plugin disabled successfully');
      queryClient.invalidateQueries({ queryKey: pluginKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: pluginKeys.status(id) });
      queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to disable plugin: ${error.message}`);
    },
  });
}

export function useValidatePlugin() {
  return useMutation({
    mutationFn: (source: string) => PluginService.validatePlugin(source),
    onSuccess: result => {
      if (result.valid) {
        toast.success('Plugin validation successful');
      } else {
        toast.error(`Plugin validation failed: ${result.errors?.join(', ')}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Validation error: ${error.message}`);
    },
  });
}

export function useUpdateConfiguration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: Partial<PluginConfiguration>) => PluginService.updateConfiguration(config),
    onSuccess: () => {
      toast.success('Configuration updated successfully');
      queryClient.invalidateQueries({ queryKey: pluginKeys.configuration() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update configuration: ${error.message}`);
    },
  });
}

export function useClearCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => PluginService.clearCache(),
    onSuccess: () => {
      toast.success('Cache cleared successfully');
      queryClient.invalidateQueries({ queryKey: pluginKeys.cache() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to clear cache: ${error.message}`);
    },
  });
}
