/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../lib/api';

// Core Plugin Interfaces
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

// Plugin Loading Interfaces
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

// Cluster Plugin Interfaces
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

export interface ClusterOnboardRequest extends Record<string, unknown> {
  clusterName: string;
  kubeconfig?: string;
}

export interface ClusterDetachRequest extends Record<string, unknown> {
  clusterName: string;
  force?: boolean;
}

// GitHub Install/Update Interfaces (Simplified)
export interface GitHubInstallRequest extends Record<string, unknown> {
  repoUrl: string;
  autoUpdate?: boolean;
  updateInterval?: number;
}

export interface GitHubUpdateRequest extends Record<string, unknown> {
  repoUrl: string;
  force?: boolean;
}

// Local Plugin Development Interface
export interface BuildInfo {
  buildCommand: string;
  requirements: string[];
  example: {
    directory: string;
    pluginPath: string;
    manifestPath: string;
  };
}

export class PluginService {
  // CORE PLUGIN MANAGEMENT
  
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

  static async unloadPlugin(pluginId: string): Promise<{ message: string; pluginId: string }> {
    const response = await api.delete(`/api/plugins/${pluginId}`);
    return response.data;
  }

  static async discoverPlugins(): Promise<PluginDiscoveryResponse> {
    const response = await api.get('/api/plugins/discover');
    return response.data;
  }

  // PLUGIN API INTERACTION

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

  // PLUGIN UTILITIES

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

  // CLUSTER PLUGIN SPECIFIC

  static async getClusterStatus(): Promise<ClusterStatusResponse> {
    const response = await this.callPluginEndpoint('kubestellar-cluster-plugin', '/status', 'GET');
    return response as unknown as ClusterStatusResponse;
  }

  static async onboardCluster(request: ClusterOnboardRequest): Promise<any> {
    return this.callPluginEndpoint('kubestellar-cluster-plugin', '/onboard', 'POST', request);
  }

  static async detachCluster(request: ClusterDetachRequest): Promise<any> {
    return this.callPluginEndpoint('kubestellar-cluster-plugin', '/detach', 'POST', request);
  }

  static async isClusterPluginLoaded(): Promise<boolean> {
    try {
      const plugins = await this.listPlugins();
      return 'kubestellar-cluster-plugin' in plugins.plugins;
    } catch {
      return false;
    }
  }

  // GITHUB REPOSITORY MANAGEMENT (Simplified)

  static async installGitHubRepository(request: GitHubInstallRequest): Promise<any> {
    const response = await api.post('/api/plugins/github/install', request);
    return response.data;
  }

  static async updateGitHubRepository(request: GitHubUpdateRequest): Promise<any> {
    const response = await api.post('/api/plugins/github/update', request);
    return response.data;
  }

  // LOCAL PLUGIN DEVELOPMENT

  static async loadLocalPlugin(request: LoadPluginFromFileRequest): Promise<PluginLoadResponse> {
    const response = await api.post('/api/plugins/local/load', request);
    return response.data;
  }

  static async unloadLocalPlugin(pluginId: string): Promise<any> {
    const response = await api.post('/api/plugins/local/unload', { pluginId });
    return response.data;
  }

  static async listLocalPlugins(): Promise<{ localPlugins: Record<string, any>; count: number }> {
    const response = await api.get('/api/plugins/local/list');
    return response.data;
  }

  static async getBuildInfo(): Promise<BuildInfo> {
    const response = await api.get('/api/plugins/local/build');
    return response.data;
  }
}

// Export for backwards compatibility
export const pluginService = PluginService;