import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { PluginService } from '../services/pluginService';

// Query keys
const pluginKeys = {
  all: ['plugins'] as const,
  lists: () => [...pluginKeys.all, 'list'] as const,
  list: (filters: string) => [...pluginKeys.lists(), { filters }] as const,
  details: () => [...pluginKeys.all, 'detail'] as const,
  detail: (id: string) => [...pluginKeys.details(), id] as const,
  health: () => [...pluginKeys.all, 'health'] as const,
  cache: () => [...pluginKeys.all, 'cache'] as const,
  available: () => [...pluginKeys.all, 'available'] as const,
  configuration: () => [...pluginKeys.all, 'configuration'] as const,
};

// Main plugin list query
export function usePlugins() {
  return useQuery({
    queryKey: pluginKeys.lists(),
    queryFn: PluginService.listPlugins,
  });
}

// Plugin details query
export function usePluginDetails(pluginId: string) {
  return useQuery({
    queryKey: pluginKeys.detail(pluginId),
    queryFn: () => PluginService.getPlugin(pluginId),
    enabled: !!pluginId,
  });
}

// Health summary query
export function useHealthSummary() {
  return useQuery({
    queryKey: pluginKeys.health(),
    queryFn: PluginService.getHealthSummary,
  });
}

// Cache info query
export function useCacheInfo() {
  return useQuery({
    queryKey: pluginKeys.cache(),
    queryFn: PluginService.getCacheInfo,
  });
}

// Available plugins query
export function useAvailablePlugins() {
  return useQuery({
    queryKey: pluginKeys.available(),
    queryFn: PluginService.getAvailablePlugins,
  });
}

// Configuration query
export function useConfiguration() {
  return useQuery({
    queryKey: pluginKeys.configuration(),
    queryFn: PluginService.getConfiguration,
  });
}

// Plugin mutations
export function useInstallPlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: PluginService.loadPlugin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pluginKeys.health() });
    },
  });
}

export function useLoadPlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: PluginService.loadPlugin,
    onSuccess: () => {
      toast.success('Plugin loaded successfully');
      queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pluginKeys.health() });
    },
    onError: () => {
      toast.error('Failed to load plugin');
    },
  });
}

export function useUninstallPlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: PluginService.unloadPlugin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pluginKeys.health() });
    },
  });
}

export function useUnloadPlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: PluginService.unloadPlugin,
    onSuccess: () => {
      toast.success('Plugin unloaded successfully');
      queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pluginKeys.health() });
    },
    onError: () => {
      toast.error('Failed to unload plugin');
    },
  });
}

export function useEnablePlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: PluginService.enablePlugin,
    onSuccess: () => {
      toast.success('Plugin enabled successfully');
      queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pluginKeys.health() });
    },
    onError: () => {
      toast.error('Failed to enable plugin');
    },
  });
}

export function useDisablePlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: PluginService.disablePlugin,
    onSuccess: () => {
      toast.success('Plugin disabled successfully');
      queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pluginKeys.health() });
    },
    onError: () => {
      toast.error('Failed to disable plugin');
    },
  });
}

export function useReloadPlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: PluginService.reloadPlugin,
    onSuccess: () => {
      toast.success('Plugin reloaded successfully');
      queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pluginKeys.health() });
    },
    onError: () => {
      toast.error('Failed to reload plugin');
    },
  });
}

export function useValidatePlugin() {
  return useMutation({
    mutationFn: PluginService.validatePlugin,
  });
}

// Update configuration mutation
export function useUpdateConfiguration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: PluginService.updateConfiguration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pluginKeys.configuration() });
    },
  });
}

// Clear cache mutation
export function useClearCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: PluginService.clearCache,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pluginKeys.cache() });
    },
  });
}
