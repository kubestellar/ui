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

export const useK8sQueries = () => {
  const useK8sInfo = () => {
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
    });
  };

  const usePodHealthQuery = () => {
    return useQuery<PodHealthResponse, Error>({
      queryKey: ['pod-health'],
      queryFn: async () => {
        const response = await api.get('/api/metrics/pod-health');
        return response.data;
      },
      staleTime: 10000, // 10 seconds
    });
  };

  // New hook for cluster resource metrics
  const useClusterMetricsQuery = () => {
    return useQuery<ClusterMetricsResponse, Error>({
      queryKey: ['cluster-metrics'],
      queryFn: async () => {
        const response = await api.get('/api/metrics/cluster-resources');
        return response.data;
      },
      staleTime: 30000, // 30 seconds - metrics don't change as frequently
      refetchInterval: 60000, // Refresh every minute
      retry: 2,
      retryDelay: 5000, // Wait 5 seconds between retries
    });
  };

  // Hook for specific cluster metrics
  const useClusterMetricsForContext = (contextName: string) => {
    return useQuery<ClusterMetrics, Error>({
      queryKey: ['cluster-metrics', contextName],
      queryFn: async () => {
        const response = await api.get(`/api/metrics/cluster-resources/${contextName}`);
        return response.data;
      },
      enabled: !!contextName,
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // Refresh every minute
      retry: 2,
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
