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

interface ContextPodHealth {
  context: string;
  error?: boolean;
  totalPods: number;
  healthyPods: number;
  percent?: number;
}

// New interface for aggregated pod health
interface AggregatedPodHealthResponse {
  totalPods: number;
  healthyPods: number;
  healthPercent: number;
  contexts: string[];
  contextDetails: ContextPodHealth[];
  note?: string;
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

  // aggregated pod health across all KubeStellar contexts
  const useAggregatedPodHealthQuery = (options?: QueryOptions) => {
    return useQuery<AggregatedPodHealthResponse, Error>({
      queryKey: ['aggregated-pod-health'],
      queryFn: async () => {
        // Get all contexts from /api/clusters endpoint
        const k8sResponse = await api.get('/api/clusters');

        // Filter only KubeStellar contexts (ending with -kubeflex)
        const kubeflexContexts = k8sResponse.data.contexts.filter((ctx: ContextInfo) =>
          ctx.name.endsWith('-kubeflex')
        );

        if (kubeflexContexts.length === 0) {
          return {
            totalPods: 0,
            healthyPods: 0,
            healthPercent: 0,
            contexts: [],
            contextDetails: [],
            note: 'No KubeStellar contexts available',
          };
        }

        const contextPromises = kubeflexContexts.map(async (ctx: ContextInfo) => {
          try {
            const response = await api.get('/api/metrics/pod-health', {
              params: { context: ctx.name },
            });
            return response.data;
          } catch (error) {
            console.error(`Error fetching metrics for context ${ctx.name}:`, error);
            return {
              context: ctx.name,
              error: true,
              totalPods: 0,
              healthyPods: 0,
            };
          }
        });

        const contextResults = await Promise.all(contextPromises);

        // Aggregate the results
        const totalPods = contextResults.reduce((sum, result) => {
          return sum + (result.totalPods || 0);
        }, 0);

        const healthyPods = contextResults.reduce((sum, result) => {
          return sum + (result.healthyPods || 0);
        }, 0);

        const healthPercent = totalPods > 0 ? Math.round((healthyPods / totalPods) * 100) : 0;

        return {
          totalPods,
          healthyPods,
          healthPercent,
          contexts: kubeflexContexts.map((ctx: ContextInfo) => ctx.name),
          contextDetails: contextResults,
          note:
            totalPods > 0
              ? 'Real-time KubeStellar metrics'
              : 'KubeStellar contexts available but no pod data',
        };
      },
      staleTime: options?.staleTime || 120000,
      gcTime: options?.cacheTime || 300000,
      refetchInterval: options?.refetchInterval || 60000,
      retry: options?.retry !== undefined ? options?.retry : 2,
      enabled: true,
    });
  };

  return {
    useK8sInfo,
    usePodHealthQuery,
    useClusterMetricsQuery,
    useClusterMetricsForContext,
    useAggregatedPodHealthQuery,
  };
};
