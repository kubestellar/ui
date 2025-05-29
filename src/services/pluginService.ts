/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../lib/api';

export interface PluginMetadata {
  ID: string;
  Name: string;
  Version: string;
  Description: string;
  Author: string;
  Endpoints: EndpointConfig[];
  Dependencies: string[];
  Permissions: string[];
  Compatibility: Record<string, string>;
}

export interface EndpointConfig {
  Path: string;
  Method: string;
  Handler: string;
}

export interface LoadedPlugin {
  Plugin: Record<string, unknown>;
  Metadata: PluginMetadata;
  FilePath: string;
  Routes: string[];
}

export interface PluginListResponse {
  plugins: Record<string, PluginMetadata>;
  count: number;
}

export interface PluginDetailsResponse {
  plugin: PluginMetadata;
  routes: string[];
  status: string;
}

export interface PluginHealthResponse {
  status: 'healthy' | 'unhealthy';
  pluginId?: string;
  error?: string;
  message?: string;
}

export interface AvailablePlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  repoUrl: string;
  official: boolean;
}

export interface PluginDiscoveryResponse {
  available: AvailablePlugin[];
  count: number;
}

export interface LoadPluginFromGitHubRequest {
  repoUrl: string;
  version?: string;
}

export interface LoadPluginFromFileRequest {
  pluginPath: string;
  manifestPath: string;
}

export interface PluginLoadResponse {
  message: string;
  repoUrl?: string;
  pluginPath?: string;
}

// Cluster Plugin specific interfaces
export interface ClusterStatus {
  clusterName: string;
  status: string;
  message?: string;
  lastUpdated: string;
}

export interface ClusterStatusResponse {
  clusters: ClusterStatus[];
  summary: {
    total: number;
    ready: number;
    pending: number;
    failed: number;
    detaching: number;
  };
  plugin: string;
  timestamp: string;
}

// Fix: Add index signature to make these compatible with Record<string, unknown>
export interface ClusterOnboardRequest extends Record<string, unknown> {
  clusterName: string;
  kubeconfig?: string;
}

export interface ClusterDetachRequest extends Record<string, unknown> {
  clusterName: string;
  force?: boolean;
}

export class PluginService {
  static async listPlugins(): Promise<PluginListResponse> {
    const response = await api.get('/api/plugins');
    return response.data;
  }

  static async getPlugin(pluginId: string): Promise<PluginDetailsResponse> {
    const response = await api.get(`/api/plugins/${pluginId}`);
    return response.data;
  }

  static async getPluginHealth(pluginId: string): Promise<PluginHealthResponse> {
    try {
      const response = await api.get(`/api/plugins/${pluginId}/health`);
      return {
        status: 'healthy',
        pluginId,
        message: 'Plugin is running normally',
        ...response.data,
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        pluginId,
        error: error.response?.data?.error || error.message || 'Health check failed',
      };
    }
  }

  static async loadPluginFromGitHub(
    request: LoadPluginFromGitHubRequest
  ): Promise<PluginLoadResponse> {
    const response = await api.post('/api/plugins/load', request);
    return response.data;
  }

  static async loadPluginFromFile(request: LoadPluginFromFileRequest): Promise<PluginLoadResponse> {
    const response = await api.post('/api/plugins/load-local', request);
    return response.data;
  }

  static async unloadPlugin(pluginId: string): Promise<{ message: string; pluginId: string }> {
    const response = await api.delete(`/api/plugins/${pluginId}`);
    return response.data;
  }

  static async discoverPlugins(): Promise<PluginDiscoveryResponse> {
    const response = await api.get('/api/plugins/discover');
    return response.data;
  }

  // Plugin-specific API calls
  static async callPluginEndpoint(
    pluginId: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const url = `/api/plugin-endpoints/${pluginId}${endpoint}`;

    try {
      switch (method) {
        case 'GET': {
          const response = await api.get(url);
          return response.data;
        }
        case 'POST': {
          const postResponse = await api.post(url, data);
          return postResponse.data;
        }
        case 'PUT': {
          const putResponse = await api.put(url, data);
          return putResponse.data;
        }
        case 'DELETE': {
          const deleteResponse = await api.delete(url);
          return deleteResponse.data;
        }
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`Plugin ${pluginId} or endpoint ${endpoint} not found`);
      } else if (error.response?.status === 400) {
        throw new Error(
          `Bad request to plugin endpoint: ${error.response?.data?.error || error.message}`
        );
      } else {
        throw new Error(`Plugin endpoint call failed: ${error.message}`);
      }
    }
  }

  // Enhanced plugin management methods
  static async getPluginEndpoints(pluginId: string): Promise<EndpointConfig[]> {
    try {
      const pluginDetails = await this.getPlugin(pluginId);
      return pluginDetails.plugin.Endpoints || [];
    } catch (error) {
      console.error(`Failed to get endpoints for plugin ${pluginId}:`, error);
      return [];
    }
  }

  static async testPluginEndpoint(
    pluginId: string,
    endpoint: EndpointConfig
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.callPluginEndpoint(pluginId, endpoint.Path, endpoint.Method as any);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Cluster Plugin specific methods
  static async getClusterStatus(): Promise<ClusterStatusResponse> {
    // Fix: Use type assertion with unknown first
    const response = await this.callPluginEndpoint('kubestellar-cluster-plugin', '/status', 'GET');
    return response as unknown as ClusterStatusResponse;
  }

  static async onboardCluster(request: ClusterOnboardRequest): Promise<any> {
    // Fix: Now compatible since ClusterOnboardRequest extends Record<string, unknown>
    return this.callPluginEndpoint('kubestellar-cluster-plugin', '/onboard', 'POST', request);
  }

  static async detachCluster(request: ClusterDetachRequest): Promise<any> {
    // Fix: Now compatible since ClusterDetachRequest extends Record<string, unknown>
    return this.callPluginEndpoint('kubestellar-cluster-plugin', '/detach', 'POST', request);
  }

  // Helper method to check if cluster plugin is loaded
  static async isClusterPluginLoaded(): Promise<boolean> {
    try {
      const plugins = await this.listPlugins();
      return 'kubestellar-cluster-plugin' in plugins.plugins;
    } catch {
      return false;
    }
  }

  // Utility methods for plugin status
  static async getAllPluginStatuses(): Promise<Record<string, PluginHealthResponse>> {
    try {
      const plugins = await this.listPlugins();
      const statuses: Record<string, PluginHealthResponse> = {};

      await Promise.all(
        Object.keys(plugins.plugins).map(async pluginId => {
          statuses[pluginId] = await this.getPluginHealth(pluginId);
        })
      );

      return statuses;
    } catch (error) {
      console.error('Failed to get plugin statuses:', error);
      return {};
    }
  }
}

// Export the original service for backwards compatibility
export const pluginService = PluginService;
