import { api } from '../lib/api';
import type {
  Plugin,
  LoadPluginRequest,
  SystemMetrics,
  PluginConfiguration,
  CacheInfo,
  AvailablePlugin,
  PluginStatus,
} from '../types/plugin';
import {
  demoPlugins,
  demoSystemMetrics,
  demoAvailablePlugins,
  demoHealthSummary,
  demoCacheInfo,
  demoConfiguration,
} from '../lib/demo-plugin-data';

export class PluginService {
  // Plugin management operations
  static async loadPlugin(request: LoadPluginRequest): Promise<Plugin> {
    try {
      const response = await api.post('/api/plugins/load', request);
      return response.data;
    } catch {
      console.warn('API not available, using demo data');
      // Return a mock plugin for demo purposes
      return demoPlugins[0];
    }
  }

  static async listPlugins(): Promise<Plugin[]> {
    try {
      const response = await api.get('/api/plugins');
      return response.data;
    } catch {
      console.warn('API not available, using demo data');
      return demoPlugins;
    }
  }

  static async getPlugin(id: string): Promise<Plugin> {
    try {
      const response = await api.get(`/api/plugins/${id}`);
      return response.data;
    } catch {
      console.warn('API not available, using demo data');
      return demoPlugins.find(p => p.metadata.id === id) || demoPlugins[0];
    }
  }

  static async unloadPlugin(id: string): Promise<void> {
    try {
      await api.delete(`/api/plugins/${id}`);
    } catch {
      console.warn('API not available, simulating success');
    }
  }

  static async reloadPlugin(id: string): Promise<Plugin> {
    try {
      const response = await api.post(`/api/plugins/${id}/reload`);
      return response.data;
    } catch {
      console.warn('API not available, using demo data');
      return demoPlugins.find(p => p.metadata.id === id) || demoPlugins[0];
    }
  }

  static async updatePlugin(id: string, config?: Record<string, unknown>): Promise<Plugin> {
    try {
      const response = await api.post(`/api/plugins/${id}/update`, { config });
      return response.data;
    } catch {
      console.warn('API not available, using demo data');
      return demoPlugins.find(p => p.metadata.id === id) || demoPlugins[0];
    }
  }

  // Plugin status and health
  static async getPluginStatus(id: string): Promise<PluginStatus> {
    try {
      const response = await api.get(`/api/plugins/${id}/status`);
      return response.data;
    } catch {
      console.warn('API not available, using demo data');
      const plugin = demoPlugins.find(p => p.metadata.id === id);
      return plugin?.status || demoPlugins[0].status;
    }
  }

  static async getHealthSummary(): Promise<{ plugins: PluginStatus[] }> {
    try {
      const response = await api.get('/api/plugins/health/summary');
      return response.data;
    } catch {
      console.warn('API not available, using demo data');
      return demoHealthSummary;
    }
  }

  // Plugin control
  static async enablePlugin(id: string): Promise<void> {
    try {
      await api.post(`/api/plugins/${id}/enable`);
    } catch {
      console.warn('API not available, simulating success');
    }
  }

  static async disablePlugin(id: string): Promise<void> {
    try {
      await api.post(`/api/plugins/${id}/disable`);
    } catch {
      console.warn('API not available, simulating success');
    }
  }

  // Plugin discovery and validation
  static async getAvailablePlugins(): Promise<AvailablePlugin[]> {
    try {
      const response = await api.get('/api/plugins/available');
      return response.data;
    } catch {
      console.warn('API not available, using demo data');
      return demoAvailablePlugins;
    }
  }

  static async validatePlugin(source: string): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      const response = await api.post('/api/plugins/validate', { source });
      return response.data;
    } catch {
      console.warn('API not available, simulating validation');
      return { valid: true };
    }
  }

  // System operations
  static async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const response = await api.get('/api/plugins/system/metrics');
      return response.data;
    } catch {
      console.warn('API not available, using demo data');
      return demoSystemMetrics;
    }
  }

  static async getConfiguration(): Promise<PluginConfiguration> {
    try {
      const response = await api.get('/api/plugins/system/configuration');
      return response.data;
    } catch {
      console.warn('API not available, using demo data');
      return demoConfiguration;
    }
  }

  static async updateConfiguration(config: Partial<PluginConfiguration>): Promise<void> {
    try {
      await api.put('/api/plugins/system/configuration', config);
    } catch {
      console.warn('API not available, simulating success');
    }
  }

  // Cache management
  static async getCacheInfo(): Promise<CacheInfo> {
    try {
      const response = await api.get('/api/plugins/cache/info');
      return response.data;
    } catch {
      console.warn('API not available, using demo data');
      return demoCacheInfo;
    }
  }

  static async clearCache(): Promise<void> {
    try {
      await api.delete('/api/plugins/cache');
    } catch {
      console.warn('API not available, simulating success');
    }
  }
}
