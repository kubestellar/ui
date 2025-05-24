import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface PluginRoute {
  method: string;
  path: string;
  description?: string;
}

export interface Plugin {
  name: string;
  version: string;
  enabled: boolean;
  type: string;
  status: string;
  description: string;
  routes: PluginRoute[];
}

export const usePluginQueries = () => {
  const usePlugins = () => {
    return useQuery<Plugin[]>({
      queryKey: ['plugins'],
      queryFn: async () => {
        const response = await api.get<Plugin[]>('/api/plugins');
        return response.data;
      },
      staleTime: 30000, // 30 seconds
      gcTime: 300000, // 5 minutes
    });
  };

  const usePluginDetails = (pluginName: string | undefined) => {
    return useQuery<Plugin>({
      queryKey: ['plugins', pluginName],
      queryFn: async () => {
        if (!pluginName) {
          throw new Error('Plugin name is required');
        }
        const response = await api.get<Plugin>(`/api/plugins/${pluginName}`);
        return response.data;
      },
      enabled: !!pluginName,
      staleTime: 30000,
      gcTime: 300000,
    });
  };

  return {
    usePlugins,
    usePluginDetails,
  };
};
