export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  endpoints: EndpointConfig[];
  permissions: string[];
  dependencies: string[];
  configuration: Record<string, unknown>;
  security: SecurityConfig;
  health: HealthConfig;
  ui_components?: UIComponent[];
}

export interface EndpointConfig {
  path: string;
  method: string;
  handler: string;
  description?: string;
}

export interface SecurityConfig {
  network_access: boolean;
  filesystem_access: boolean;
  sandboxed: boolean;
}

export interface HealthConfig {
  enabled: boolean;
  interval_seconds: number;
}

export interface UIComponent {
  name: string;
  route: string;
  component: string;
}

export interface PluginStatus {
  id: string;
  status: 'enabled' | 'disabled' | 'failed' | 'loading';
  health: 'healthy' | 'unhealthy' | 'unknown';
  uptime: number;
  last_updated: string;
  request_count: number;
  error_count: number;
  error_message?: string;
}

export interface Plugin {
  metadata: PluginMetadata;
  status: PluginStatus;
  source: string;
  loaded_at: string;
  file_path: string;
  enabled: boolean;
}

export interface LoadPluginRequest {
  source: string;
  version?: string;
  config?: Record<string, unknown>;
}

export interface PluginError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface CacheInfo {
  total_size: string;
  num_entries: number;
  hit_rate: number;
  last_cleanup: string;
}

export interface PluginConfiguration {
  cache_enabled: boolean;
  cache_max_size: string;
  security_enabled: boolean;
}

export interface AvailablePlugin {
  id?: string;
  repository: string;
  name: string;
  description: string;
  latest_version: string;
  author: string;
  stars: number;
  last_updated: string;
  download_url: string;
  tags?: string[];
  icon?: string;
  verified?: boolean;
  official?: boolean;
  version?: string;
}
