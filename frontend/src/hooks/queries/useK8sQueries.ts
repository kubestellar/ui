import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface ContextInfo {
  name: string;
  cluster: string;
}

interface K8sResponse {
  contexts: ContextInfo[];
  clusters: unknown[];
  currentContext: string;
}

interface PodHealthResponse {
  totalPods: number;
  healthyPods: number;
  healthPercent: number;
  context: string;
}

// New interfaces for cluster metrics
interface ClusterMetrics {
  clusterName: string;
  cpuUsage: number;
  memoryUsage: number;
  totalCPU: string;
  totalMemory: string;
  usedCPU: string;
  usedMemory: string;
  nodeCount: number;
  timestamp: string;
  error?: string;
}

interface ClusterMetricsResponse {
  clusters: ClusterMetrics[];
  overallCPU: number;
  overallMemory: number;
  totalClusters: number;
  activeClusters: number;
  timestamp: string;
}

// Query options interface
interface QueryOptions {
  staleTime?: number;
  cacheTime?: number;
  refetchInterval?: number;
  retry?: number | boolean;
  enabled?: boolean;
}

export const useK8sQueries = () => {
  const useK8sInfo = (options?: QueryOptions) => {
    return useQuery({
      queryKey: ['k8s-info'],
      queryFn: async (): Promise<K8sResponse> => {
        const response = await api.get('/api/clusters');
        return {
          contexts: response.data.contexts,
          clusters: response.data.clusters,
          currentContext: response.data.currentContext,
        };
      },
      staleTime: options?.staleTime || 5000, // Default 5 seconds
      gcTime: options?.cacheTime || 300000, // Default 5 minutes
      refetchInterval: options?.refetchInterval,
      retry: options?.retry !== undefined ? options?.retry : 1,
      enabled: options?.enabled !== undefined ? options.enabled : true,
    });
  };

  const usePodHealthQuery = (contextName?: string, options?: QueryOptions) => {
    return useQuery<PodHealthResponse, Error>({
      queryKey: ['pod-health', contextName],
      queryFn: async () => {
        const params = contextName ? { context: contextName } : {};
        const response = await api.get('/api/metrics/pod-health', { params });
        return response.data;
      },
      staleTime: options?.staleTime || 10000, // Default 10 seconds
      gcTime: options?.cacheTime || 300000, // Default 5 minutes
      refetchInterval: options?.refetchInterval,
      retry: options?.retry !== undefined ? options?.retry : 1,
      retryDelay: 5000, // Wait 5 seconds between retries
      enabled: !!contextName && options?.enabled !== false, // Only run if context is provided
    });
  };

  // New hook for cluster resource metrics
  const useClusterMetricsQuery = (options?: QueryOptions) => {
    return useQuery<ClusterMetricsResponse, Error>({
      queryKey: ['cluster-metrics'],
      queryFn: async () => {
        const response = await api.get('/api/metrics/cluster-resources');
        return response.data;
      },
      staleTime: options?.staleTime || 30000, // Default 30 seconds
      gcTime: options?.cacheTime || 300000, // Default 5 minutes
      refetchInterval: options?.refetchInterval || 60000, // Default refresh every minute
      retry: options?.retry !== undefined ? options?.retry : 2,
      retryDelay: 5000, // Wait 5 seconds between retries
      enabled: options?.enabled !== undefined ? options.enabled : true,
    });
  };

  // Hook for specific cluster metrics
  const useClusterMetricsForContext = (contextName: string, options?: QueryOptions) => {
    return useQuery<ClusterMetrics, Error>({
      queryKey: ['cluster-metrics', contextName],
      queryFn: async () => {
        const response = await api.get(`/api/metrics/cluster-resources/${contextName}`);
        return response.data;
      },
      enabled: !!contextName && options?.enabled !== false,
      staleTime: options?.staleTime || 30000, // Default 30 seconds
      gcTime: options?.cacheTime || 300000, // Default 5 minutes
      refetchInterval: options?.refetchInterval || 60000, // Default refresh every minute
      retry: options?.retry !== undefined ? options?.retry : 2,
      retryDelay: 5000,
    });
  };

  return {
    useK8sInfo,
    usePodHealthQuery,
    useClusterMetricsQuery,
    useClusterMetricsForContext,
  };
};
