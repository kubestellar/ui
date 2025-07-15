import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

// Get Prometheus URL from environment variable with fallback
const getPrometheusUrl = () => {
  const url = import.meta.env.VITE_PROMETHEUS_URL;
  return url ? url : 'http://localhost:9090';
};

// Prometheus API response types
export interface PrometheusMetric {
  metric: Record<string, string>;
  value: [number, string];
}

export interface PrometheusResponse {
  status: string;
  data: {
    resultType: string;
    result: PrometheusMetric[];
  };
}

// Cache metrics types
export interface CacheMetrics {
  hits: PrometheusMetric[];
  misses: PrometheusMetric[];
}

// Cluster metrics types
export interface ClusterMetrics {
  onboardingDuration: PrometheusMetric[];
  kubectlOperations: PrometheusMetric[];
}

// Runtime metrics types
export interface RuntimeMetrics {
  goroutines: PrometheusMetric[];
}

// Metrics summary
export interface MetricsSummary {
  cache: CacheMetrics;
  cluster: ClusterMetrics;
  runtime: RuntimeMetrics;
  timestamp: string;
}

// Fetch cache metrics from Prometheus
const fetchCacheMetrics = async (): Promise<CacheMetrics> => {
  try {
    const prometheusUrl = getPrometheusUrl();
    const [hitsResponse, missesResponse] = await Promise.all([
      api.get<PrometheusResponse>(
        `${prometheusUrl}/api/v1/query?query=kubestellar_binding_policy_cache_hits_total`
      ),
      api.get<PrometheusResponse>(
        `${prometheusUrl}/api/v1/query?query=kubestellar_binding_policy_cache_misses_total`
      ),
    ]);

    return {
      hits: hitsResponse.data.data.result || [],
      misses: missesResponse.data.data.result || [],
    };
  } catch (error) {
    console.error('Error fetching cache metrics:', error);
    return { hits: [], misses: [] };
  }
};

// Fetch cluster metrics from Prometheus
const fetchClusterMetrics = async (): Promise<ClusterMetrics> => {
  try {
    const prometheusUrl = getPrometheusUrl();
    const [onboardingResponse, kubectlResponse] = await Promise.all([
      api.get<PrometheusResponse>(
        `${prometheusUrl}/api/v1/query?query=cluster_onboarding_duration_seconds`
      ),
      api.get<PrometheusResponse>(`${prometheusUrl}/api/v1/query?query=kubectl_operations_total`),
    ]);

    return {
      onboardingDuration: onboardingResponse.data.data.result || [],
      kubectlOperations: kubectlResponse.data.data.result || [],
    };
  } catch (error) {
    console.error('Error fetching cluster metrics:', error);
    return { onboardingDuration: [], kubectlOperations: [] };
  }
};

// Fetch runtime metrics from Prometheus
const fetchRuntimeMetrics = async (): Promise<RuntimeMetrics> => {
  try {
    const prometheusUrl = getPrometheusUrl();
    const response = await api.get<PrometheusResponse>(
      `${prometheusUrl}/api/v1/query?query=go_goroutines`
    );

    return {
      goroutines: response.data.data.result || [],
    };
  } catch (error) {
    console.error('Error fetching runtime metrics:', error);
    return { goroutines: [] };
  }
};

// Fetch all metrics summary
const fetchMetricsSummary = async (): Promise<MetricsSummary> => {
  const [cache, cluster, runtime] = await Promise.all([
    fetchCacheMetrics(),
    fetchClusterMetrics(),
    fetchRuntimeMetrics(),
  ]);

  return {
    cache,
    cluster,
    runtime,
    timestamp: new Date().toISOString(),
  };
};

// Custom hooks
export const useMetricsQueries = () => {
  const useCacheMetrics = (options = {}) =>
    useQuery({
      queryKey: ['cache-metrics'],
      queryFn: fetchCacheMetrics,
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 25000,
      ...options,
    });

  const useClusterMetrics = (options = {}) =>
    useQuery({
      queryKey: ['cluster-metrics'],
      queryFn: fetchClusterMetrics,
      refetchInterval: 30000,
      staleTime: 25000,
      ...options,
    });

  const useRuntimeMetrics = (options = {}) =>
    useQuery({
      queryKey: ['runtime-metrics'],
      queryFn: fetchRuntimeMetrics,
      refetchInterval: 10000, // More frequent for runtime metrics
      staleTime: 8000,
      ...options,
    });

  const useMetricsSummary = (options = {}) =>
    useQuery({
      queryKey: ['metrics-summary'],
      queryFn: fetchMetricsSummary,
      refetchInterval: 30000,
      staleTime: 25000,
      ...options,
    });

  return {
    useCacheMetrics,
    useClusterMetrics,
    useRuntimeMetrics,
    useMetricsSummary,
  };
};

// Helper functions for processing metrics
export const processMetricValue = (metric: PrometheusMetric): number => {
  return parseFloat(metric.value[1]) || 0;
};

export const aggregateMetricsByLabel = (
  metrics: PrometheusMetric[],
  labelKey: string
): Record<string, number> => {
  return metrics.reduce(
    (acc, metric) => {
      const labelValue = metric.metric[labelKey] || 'unknown';
      acc[labelValue] = (acc[labelValue] || 0) + processMetricValue(metric);
      return acc;
    },
    {} as Record<string, number>
  );
};

export const calculateCacheHitRatio = (
  hits: PrometheusMetric[],
  misses: PrometheusMetric[]
): number => {
  const totalHits = hits.reduce((sum, metric) => sum + processMetricValue(metric), 0);
  const totalMisses = misses.reduce((sum, metric) => sum + processMetricValue(metric), 0);
  const total = totalHits + totalMisses;

  if (total === 0) return 0;
  return (totalHits / total) * 100;
};
