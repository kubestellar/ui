/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  wasm: WASMConfig;
  backend: BackendConfig;
  frontend: FrontendConfig;
  config: Record<string, any>;
}

export interface WASMConfig {
  file: string;
  entrypoint: string;
}

export interface BackendConfig {
  enabled: boolean;
  routes: PluginRoute[];
}

export interface FrontendConfig {
  enabled: boolean;
  navigation: PluginNavigationItem[];
  widgets: PluginWidgetConfig[];
  assets: PluginAssetConfig[];
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
  wasmModule: WebAssembly.Module | null;
  widgets: Map<string, React.ComponentType<any>>;
  isLoaded: boolean;
  loadedAt: Date;
}

export interface WASMModule {
  instance: WebAssembly.Instance;
  memory: WebAssembly.Memory;
  exports: Record<string, any>;
}

export interface PluginError {
  pluginName: string;
  error: Error;
  timestamp: Date;
  context: string;
}

export interface PluginMetrics {
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
