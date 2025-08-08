import { api } from '../lib/api';
import { PluginAPIResponse, PluginStatus, PluginManifestWithID } from './types';

export class PluginAPI {
  private baseURL = '/api/plugins';

  async getPluginManifests(): Promise<PluginManifestWithID[]> {
    const response = await api.get<PluginAPIResponse<PluginManifestWithID[]>>(
      `${this.baseURL}/manifests`
    );
    console.log(response.data.data);
    return response.data.data || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getPluginList(): Promise<any[]> {
    const response = await api.get(`${this.baseURL}`);
    return response.data.plugins || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getPluginDetails(pluginID: number): Promise<any> {
    const response = await api.get(`${this.baseURL}/${pluginID}`);
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
  async installPluginFile(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`${this.baseURL}/install`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async uninstallPlugin(pluginID: number): Promise<any> {
    const response = await api.delete(`${this.baseURL}/${pluginID}`);
    return response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async enablePlugin(pluginID: number): Promise<any> {
    const response = await api.post(`${this.baseURL}/${pluginID}/enable`);
    return response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async disablePlugin(pluginID: number): Promise<any> {
    const response = await api.post(`${this.baseURL}/${pluginID}/disable`);
    return response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async reloadPlugin(pluginID: number): Promise<any> {
    const response = await api.post(`${this.baseURL}/${pluginID}/reload`);
    return response.data;
  }

  async getPluginStatus(pluginID: number): Promise<PluginStatus> {
    const response = await api.get<PluginStatus>(`${this.baseURL}/${pluginID}/status`);
    return response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async callPluginFunction(pluginID: number, functionPath: string, data?: any): Promise<any> {
    const response = await api.post(`${this.baseURL}/${pluginID}${functionPath}`, data || {});
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
  getPluginURL(pluginID: number, path: string = ''): string {
    return `${this.baseURL}/${pluginID}${path}`;
  }

  // Helper method to get plugin asset URLs
  getPluginAssetURL(pluginID: number, assetPath: string): string {
    return `${this.baseURL}/${pluginID}/assets${assetPath}`;
  }
}
