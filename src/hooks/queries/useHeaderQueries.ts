import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface Context {
  name: string;
  cluster: string;
}

interface ClusterContextResponse {
  contexts: Context[];
  currentContext: string;
  clusters: string[];
}

export const useHeaderQueries = () => {
  const useContexts = () => {
    return useQuery({
      queryKey: ['contexts'],
      queryFn: async (): Promise<ClusterContextResponse> => {
        const response = await api.get('/api/clusters');
        return {
          contexts: response.data.contexts.filter((ctx: Context) => 
            ctx.name.endsWith("-kubeflex") || ctx.cluster.endsWith("-kubeflex")
          ),
          currentContext: response.data.currentContext,
          clusters: response.data.clusters
        };
      },
    });
  };

  return {
    useContexts,
  };
}; 