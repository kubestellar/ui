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

  return {
    useK8sInfo,
  };
}; 