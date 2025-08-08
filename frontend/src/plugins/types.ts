/* eslint-disable @typescript-eslint/no-explicit-any */

// This is the response from the API
export interface PluginManifestWithID {
  id: number;
  manifest: PluginManifest;
}

export interface PluginManifest {
  id: number;
  apiVersion: string;
  kind: string;
  metadata: Metadata;
  spec: PluginSpec;
}

export interface Metadata {
  name: string;
  version: string;
  author: string;
  description: string;
}

export interface PluginSpec {
  wasm: WasmConfig;
  build: BuildConfig;
  backend: BackendConfig;
  frontend: FrontendConfig;
  permissions: string[];
}

export interface WasmConfig {
  file: string;
  entrypoint: string;
  memory_limit: string;
}

export interface BuildConfig {
  go_version: string;
  tinygo_version: string;
}

export interface BackendConfig {
  enabled: boolean;
  routes: BackendRoute[];
}

export interface BackendRoute {
  path: string;
  methods: string[];
  handler: string;
}

export interface FrontendConfig {
  enabled: boolean;
  navigation: FrontendNavigation[];
  widgets: FrontendWidget[];
  routes: FrontendRoute[];
}

export interface FrontendNavigation {
  label: string;
  icon: string;
  path: string;
  position: string;
  order: number;
}

export interface FrontendWidget {
  name: string;
  title: string;
  size: string;
  dashboard: string;
  component: string;
}

export interface FrontendRoute {
  path: string;
  component: string;
  exact: boolean;
}

export interface PluginRoute {
  path: string;
  methods: string[];
  handler: string;
}

export interface PluginNavigationItem {
  path: string;
  label: string;
  icon: string;
}

export interface PluginWidgetConfig {
  name: string;
  type: 'chart' | 'table' | 'metrics' | 'custom';
  config: Record<string, any>;
}

export interface PluginAssetConfig {
  path: string;
  type: 'js' | 'css';
}

export interface PluginInstance {
  manifest: PluginManifest;
  isLoaded: boolean;
  loadedAt: Date;
}

export interface PluginError {
  pluginID: number;
  pluginName: string;
  error: Error;
  timestamp: Date;
  context: string;
}

export interface PluginMetrics {
  pluginID: number;
  pluginName: string;
  loadTime: number;
  memoryUsage: number;
  functionCalls: number;
  errors: PluginError[];
}

export interface PluginStatus {
  name: string;
  status: 'loading' | 'loaded' | 'error' | 'unloaded';
  message?: string;
  lastUpdated: Date;
}

export interface PluginAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface PluginConfig {
  autoLoad: boolean;
  enableDevMode: boolean;
  maxMemoryUsage: number;
  refreshInterval: number;
  errorReporting: boolean;
}

export interface PluginRegistry {
  plugins: Map<string, PluginInstance>;
  manifests: PluginManifest[];
  status: Map<string, PluginStatus>;
  config: PluginConfig;
}
