import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface ManagedClusterInfo {
  name: string;
  labels: { [key: string]: string };
  creationTime: string;
  status: string;
  context: string;
  namespace?: string;
}

interface ClusterResponse {
  itsData: ManagedClusterInfo[];
  totalPages: number;
}

export interface ClusterStatus {
  name: string;
  status: string;
  message?: string;
}

// Assuming we have a specific type for the data being fetched


export interface ClusterData {
  clusterName: string;
  Region: string;
  node: string;
  value: string[];
}

export const useClusterQueries = () => {
  const queryClient = useQueryClient();

  // Fetch clusters with pagination
  const useClusters = (page: number = 1) => {
    return useQuery({
      queryKey: ['clusters', page],
      queryFn: async (): Promise<ClusterResponse> => {
        const response = await api.get('/api/clusters', { params: { page } });
        return {
          itsData: response.data.itsData || [],
          totalPages: response.data.totalPages || 1,
        };
      },
    });
  };

  // Get cluster status
  const useClusterStatus = () => {
    return useQuery({
      queryKey: ['cluster-status'],
      queryFn: async (): Promise<ClusterStatus[]> => {
        const response = await api.get('/clusters/status');
        return response.data;
      },
    });
  };

  // Import cluster mutation
  const useImportCluster = () => {
    return useMutation<unknown, Error, ClusterData>({
      mutationFn: async (clusterData: ClusterData) => {
        const response = await api.post('/clusters/import', clusterData);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['clusters'] });
      },
    });
  };

  // Onboard cluster mutation
  const useOnboardCluster = () => {
    return useMutation({
      mutationFn: async (clusterData: ClusterData) => {
        const response = await api.post('/clusters/onboard', clusterData);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['clusters'] });
      },
    });
  };

  return {
    useClusters,
    useClusterStatus,
    useImportCluster,
    useOnboardCluster,
  };
}; 