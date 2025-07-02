import { api } from '../lib/api';
import { PluginManifest, PluginAPIResponse, PluginStatus } from './types';

export class PluginAPI {
  private baseURL = '/api/plugins';

  async getPluginManifests(): Promise<PluginManifest[]> {
    const response = await api.get<PluginAPIResponse<PluginManifest[]>>(
      `${this.baseURL}/manifests`
    );
    return response.data.data || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getPluginList(): Promise<any[]> {
    const response = await api.get(`${this.baseURL}`);
    return response.data.plugins || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getPluginDetails(pluginName: string): Promise<any> {
    const response = await api.get(`${this.baseURL}/${pluginName}`);
    return response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async installPlugin(source: string, options?: any): Promise<any> {
    const payload = {
      source,
      ...options,
    };

    const response = await api.post(`${this.baseURL}/install`, payload);
    return response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async uninstallPlugin(pluginName: string): Promise<any> {
    const response = await api.delete(`${this.baseURL}/${pluginName}`);
    return response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async enablePlugin(pluginName: string): Promise<any> {
    const response = await api.post(`${this.baseURL}/${pluginName}/enable`);
    return response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async disablePlugin(pluginName: string): Promise<any> {
    const response = await api.post(`${this.baseURL}/${pluginName}/disable`);
    return response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async reloadPlugin(pluginName: string): Promise<any> {
    const response = await api.post(`${this.baseURL}/${pluginName}/reload`);
    return response.data;
  }

  async getPluginStatus(pluginName: string): Promise<PluginStatus> {
    const response = await api.get<PluginStatus>(`${this.baseURL}/${pluginName}/status`);
    return response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async callPluginFunction(pluginName: string, functionPath: string, data?: any): Promise<any> {
    const response = await api.post(`${this.baseURL}/${pluginName}${functionPath}`, data || {});
    return response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getPluginMetrics(): Promise<any> {
    const response = await api.get(`${this.baseURL}/system/metrics`);
    return response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getPluginConfiguration(): Promise<any> {
    const response = await api.get(`${this.baseURL}/system/configuration`);
    return response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updatePluginConfiguration(config: any): Promise<any> {
    const response = await api.put(`${this.baseURL}/system/configuration`, config);
    return response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async submitPluginFeedback(feedback: any): Promise<any> {
    const response = await api.post(`${this.baseURL}/feedback`, feedback);
    return response;
  }

  // Helper method to build plugin-specific URLs
  getPluginURL(pluginName: string, path: string = ''): string {
    return `${this.baseURL}/${pluginName}${path}`;
  }

  // Helper method to get plugin asset URLs
  getPluginAssetURL(pluginName: string, assetPath: string): string {
    return `${this.baseURL}/${pluginName}/assets${assetPath}`;
  }
}
