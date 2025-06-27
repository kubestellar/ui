import { PluginManifest, PluginAPIResponse, PluginStatus } from './types';

export class PluginAPI {
  private baseURL = '/api/plugins';

  async getPluginManifests(): Promise<PluginManifest[]> {
    try {
      const response = await fetch(`${this.baseURL}/manifests`);
      if (!response.ok) {
        throw new Error(`Failed to fetch plugin manifests: ${response.statusText}`);
      }

      const data: PluginAPIResponse<PluginManifest[]> = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Failed to get plugin manifests:', error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getPluginList(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseURL}/list`);
      if (!response.ok) {
        throw new Error(`Failed to fetch plugin list: ${response.statusText}`);
      }

      const data = await response.json();
      return data.plugins || [];
    } catch (error) {
      console.error('Failed to get plugin list:', error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getPluginDetails(pluginName: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/${pluginName}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch plugin details: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to get plugin details for ${pluginName}:`, error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async installPlugin(source: string, options?: any): Promise<any> {
    try {
      console.log('Installing plugin from:', source);

      const response = await fetch(`${this.baseURL}/install`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source,
          ...options,
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const responseText = await response.text();
        console.error('Error response body:', responseText);

        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.error || `Failed to install plugin: ${response.statusText}`);
        } catch {
          throw new Error(`Failed to install plugin: ${response.statusText} - ${responseText}`);
        }
      }

      // Get response as text first to debug
      const responseText = await response.text();
      console.log('Success response body:', responseText);

      try {
        return JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        console.error('Response text:', responseText);
        throw new Error(`Invalid JSON response: ${responseText}`);
      }
    } catch (error) {
      console.error('Failed to install plugin:', error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async uninstallPlugin(pluginName: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/${pluginName}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to uninstall plugin: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to uninstall plugin ${pluginName}:`, error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async enablePlugin(pluginName: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/${pluginName}/enable`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to enable plugin: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to enable plugin ${pluginName}:`, error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async disablePlugin(pluginName: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/${pluginName}/disable`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to disable plugin: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to disable plugin ${pluginName}:`, error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async reloadPlugin(pluginName: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/${pluginName}/reload`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to reload plugin: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to reload plugin ${pluginName}:`, error);
      throw error;
    }
  }

  async getPluginStatus(pluginName: string): Promise<PluginStatus> {
    try {
      const response = await fetch(`${this.baseURL}/${pluginName}/status`);
      if (!response.ok) {
        throw new Error(`Failed to get plugin status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to get plugin status for ${pluginName}:`, error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async callPluginFunction(pluginName: string, functionPath: string, data?: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/${pluginName}${functionPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data || {}),
      });

      if (!response.ok) {
        throw new Error(`Plugin function call failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to call plugin function ${pluginName}${functionPath}:`, error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getPluginMetrics(): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/system/metrics`);
      if (!response.ok) {
        throw new Error(`Failed to get plugin metrics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get plugin metrics:', error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getPluginConfiguration(): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/system/configuration`);
      if (!response.ok) {
        throw new Error(`Failed to get plugin configuration: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get plugin configuration:', error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updatePluginConfiguration(config: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/system/configuration`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Failed to update plugin configuration: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update plugin configuration:', error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async submitPluginFeedback(feedback: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedback),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit plugin feedback: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to submit plugin feedback:', error);
      throw error;
    }
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
