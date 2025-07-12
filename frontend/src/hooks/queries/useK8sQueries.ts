import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface ContextInfo {
  name: string;
  cluster: string;
}

interface K8sResponse {
  contexts: ContextInfo[];
  clusters: string[];
  currentContext: string;
}

interface PodHealthResponse {
  totalPods: number;
  healthyPods: number;
  healthPercent: number;
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

  return {
    useK8sInfo,
    usePodHealthQuery,
  };
};
