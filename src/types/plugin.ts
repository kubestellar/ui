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
  status: 'loading' | 'loaded' | 'failed' | 'unloaded' | 'enabled' | 'disabled';
  health: 'healthy' | 'unhealthy' | 'unknown';
  last_updated: string;
  error_message?: string;
  uptime: number;
  request_count: number;
  error_count: number;
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

export interface SystemMetrics {
  total_plugins: number;
  active_plugins: number;
  failed_plugins: number;
  total_requests: number;
  avg_response_time: number;
  memory_usage: string;
  uptime: string;
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
  health_check_interval: string;
  max_concurrent_loads: number;
  plugin_timeout: string;
  security_enabled: boolean;
}

export interface AvailablePlugin {
  repository: string;
  name: string;
  description: string;
  latest_version: string;
  author: string;
  stars: number;
  last_updated: string;
  download_url: string;
}
