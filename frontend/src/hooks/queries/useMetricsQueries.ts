import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface ComponentStatus {
  status: string;
  last_checked: string;
  error?: string;
  details?: string;
}

export interface RuntimeMetrics {
  go_version: string;
  goroutines: number;
  memory_usage: string;
  cpu_count: number;
  gc_cycles: number;
  heap_objects: number;
}

export interface SystemMetrics {
  timestamp: string;
  uptime: string;
  version: string;
  components: Record<string, ComponentStatus>;
  runtime: RuntimeMetrics;
}

export interface DeploymentStats {
  github: {
    count: number;
    webhook: number;
    manual: number;
    failed: number;
  };
  helm: {
    count: number;
    active: number;
    failed: number;
    succeeded: number;
  };
  total: number;
}

export interface DeploymentsResponse {
  stats: DeploymentStats;
  timestamp: string;
}

export interface HealthResponse {
  overall_status: string;
  timestamp: string;
  components: Record<string, ComponentStatus>;
  summary: {
    healthy_components: number;
    total_components: number;
    health_percentage: number;
  };
}

export interface GitHubMetricsResponse {
  statistics: DeploymentStats['github'];
  configuration: Record<string, string>;
  recent_deployments?: unknown[];
  timestamp: string;
}

export interface HelmMetricsResponse {
  statistics: DeploymentStats['helm'];
  timestamp: string;
}

export interface RedisMetricsResponse {
  status: ComponentStatus;
  configuration: Record<string, unknown>;
  timestamp: string;
}

export interface KubernetesMetricsResponse {
  status: ComponentStatus;
  config_maps: Record<string, string>;
  timestamp: string;
}

export interface PodHealthMetricsResponse {
  totalPods: number;
  healthyPods: number;
  healthPercent: number;
}

export const useSystemMetrics = (options = {}) =>
  useQuery({
    queryKey: ['system-metrics'],
    queryFn: async () => (await api.get<SystemMetrics>('/api/metrics/system')).data,
    ...options,
  });

export const useDeploymentsMetrics = (options = {}) =>
  useQuery({
    queryKey: ['deployments-metrics'],
    queryFn: async () => (await api.get<DeploymentsResponse>('/api/metrics/deployments')).data,
    ...options,
  });

export const useHealthMetrics = (options = {}) =>
  useQuery({
    queryKey: ['health-metrics'],
    queryFn: async () => (await api.get<HealthResponse>('/api/metrics/health')).data,
    ...options,
  });

export const useGitHubMetrics = (options = {}) =>
  useQuery({
    queryKey: ['github-metrics'],
    queryFn: async () => (await api.get<GitHubMetricsResponse>('/api/metrics/github')).data,
    ...options,
  });

export const useHelmMetrics = (options = {}) =>
  useQuery({
    queryKey: ['helm-metrics'],
    queryFn: async () => (await api.get<HelmMetricsResponse>('/api/metrics/helm')).data,
    ...options,
  });

export const useRedisMetrics = (options = {}) =>
  useQuery({
    queryKey: ['redis-metrics'],
    queryFn: async () => (await api.get<RedisMetricsResponse>('/api/metrics/redis')).data,
    ...options,
  });

export const useKubernetesMetrics = (options = {}) =>
  useQuery({
    queryKey: ['kubernetes-metrics'],
    queryFn: async () => (await api.get<KubernetesMetricsResponse>('/api/metrics/kubernetes')).data,
    ...options,
  });

export const usePodHealthMetrics = (options = {}) =>
  useQuery({
    queryKey: ['pod-health-metrics'],
    queryFn: async () => (await api.get<PodHealthMetricsResponse>('/api/metrics/pod-health')).data,
    ...options,
  });

export const usePrometheusMetric = (metricName: string, options = {}) =>
  useQuery({
    queryKey: ['prometheus-metric', metricName],
    queryFn: async () => (await api.get(`/api/v1/metrics?name=${metricName}`)).data,
    ...options,
  });

export const useHTTPErrorCounter = (options = {}) =>
  usePrometheusMetric('http_error_requests_total', options);
export const useBindingPolicyCacheHits = (options = {}) =>
  usePrometheusMetric('kubestellar_binding_policy_cache_hits_total', options);
export const useBindingPolicyCacheMisses = (options = {}) =>
  usePrometheusMetric('kubestellar_binding_policy_cache_misses_total', options);
export const useBindingPolicyWatchEvents = (options = {}) =>
  usePrometheusMetric('kubestellar_binding_policy_watch_events_total', options);
export const useBindingPolicyReconciliationDuration = (options = {}) =>
  usePrometheusMetric('kubestellar_binding_policy_reconciliation_duration_seconds', options);
export const useBindingPolicyOperationsTotal = (options = {}) =>
  usePrometheusMetric('kubestellar_binding_policy_operations_total', options);
export const useWebsocketConnectionsFailed = (options = {}) =>
  usePrometheusMetric('websocket_connections_failed_total', options);
export const useWebsocketConnectionsActive = (options = {}) =>
  usePrometheusMetric('websocket_connections_active', options);
export const useKubectlOperationsTotal = (options = {}) =>
  usePrometheusMetric('kubectl_operations_total', options);
export const useClusterOnboardingDuration = (options = {}) =>
  usePrometheusMetric('cluster_onboarding_duration_seconds', options);
export const useGoGoroutines = (options = {}) => usePrometheusMetric('go_goroutines', options);
