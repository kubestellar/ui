import { api } from '../lib/api';
import type {
  Plugin,
  LoadPluginRequest,
  PluginConfiguration,
  CacheInfo,
  AvailablePlugin,
  PluginStatus,
} from '../types/plugin';
import {
  demoPlugins,
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

  static async listPlugins(): Promise<{ plugins: Record<string, Plugin>; count: number }> {
    try {
      const response = await api.get('/api/plugins');
      return response.data;
    } catch {
      console.warn('API not available, using demo data');
      const pluginsMap: Record<string, Plugin> = {};
      demoPlugins.forEach(plugin => {
        pluginsMap[plugin.metadata.id] = plugin;
      });
      return { plugins: pluginsMap, count: demoPlugins.length };
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

  // Directory-based plugin operations
  static async getAvailableDirectories(): Promise<
    {
      path: string;
      name: string;
      hasMainGo: boolean;
      hasManifest: boolean;
      isValid: boolean;
      metadata: {
        name: string;
        version: string;
        description: string;
      };
    }[]
  > {
    try {
      const response = await api.get('/api/plugins/local/directories');
      return response.data.directories || [];
    } catch {
      console.warn('API not available, using demo data');
      return [
        {
          path: './plugins/cluster-ops',
          name: 'cluster-ops',
          hasMainGo: true,
          hasManifest: true,
          isValid: true,
          metadata: {
            name: 'Cluster Operations Plugin',
            version: '1.0.0',
            description: 'Plugin for managing cluster operations',
          },
        },
      ];
    }
  }

  static async loadPluginFromDirectory(directoryPath: string): Promise<void> {
    try {
      await api.post('/api/plugins/local/load-directory', { directoryPath });
    } catch {
      console.warn('API not available, simulating success');
    }
  }

  // ZIP upload plugin operations
  static async uploadPluginZip(
    file: File
  ): Promise<{ upload_id: string; validation: { valid: boolean; errors?: string[] } }> {
    try {
      const formData = new FormData();
      formData.append('plugin', file);

      const response = await api.post('/api/plugins/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch {
      console.warn('API not available, simulating upload');
      return {
        upload_id: 'demo-upload-123',
        validation: { valid: true },
      };
    }
  }

  static async installUploadedPlugin(uploadId: string): Promise<void> {
    try {
      await api.post(`/api/plugins/install/${uploadId}`);
    } catch {
      console.warn('API not available, simulating installation');
    }
  }
}
