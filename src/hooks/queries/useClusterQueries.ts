import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface ManagedClusterInfo {
  name: string;
  uid?: string;
  labels: { [key: string]: string };
  creationTime?: string;
  creationTimestamp?: string;
  status: string;
  context: string;
  namespace?: string;
  available?: boolean;
  joined?: boolean;
}

interface ClusterResponse {
  clusters: ManagedClusterInfo[];
  count: number;
  itsData?: Array<{
    name: string;
    labels?: { [key: string]: string };
    // Add other properties that might be used
    status?: string;
    metrics?: {
      cpu?: string;
      memory?: string;
      storage?: string;
    };
  }>;
}

interface ClusterApiResponse {
  name: string;
  uid: string;
  creationTimestamp: string;
  labels: { [key: string]: string };
  status: {
    conditions: Array<{
      lastTransitionTime: string;
      message: string;
      reason: string;
      status: string;
      type: string;
    }>;
    version?: {
      kubernetes: string;
    };
  };
  available: boolean;
  joined: boolean;
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

// Interface for the manual onboarding method
export interface ClusterOnboardData {
  clusterName: string;
}

// Add a new interface for detailed cluster information
export interface ClusterDetails {
  name: string;
  uid: string;
  creationTimestamp: string;
  labels: { [key: string]: string };
  status: {
    conditions: Array<{
      lastTransitionTime: string;
      message: string;
      reason: string;
      status: string;
      type: string;
    }>;
    version?: {
      kubernetes: string;
    };
    capacity?: {
      cpu: string;
      memory: string;
      pods: string;
      [key: string]: string;
    };
  };
  available: boolean;
  joined: boolean;
}

export const useClusterQueries = () => {
  const queryClient = useQueryClient();

  // Fetch clusters with pagination
  const useClusters = (page: number = 1) => {
    return useQuery({
      queryKey: ['clusters', page],
      queryFn: async (): Promise<ClusterResponse> => {
        const response = await api.get('/api/new/clusters', { params: { page } });

        const clusters = response.data.clusters.map((cluster: ClusterApiResponse) => ({
          name: cluster.name,
          uid: cluster.uid,
          creationTime: cluster.creationTimestamp,
          creationTimestamp: cluster.creationTimestamp,
          status: cluster.available ? 'Available' : 'Unavailable',
          context: 'its1',
          available: cluster.available,
          joined: cluster.joined,
          labels: cluster.labels || {},
        }));

        return {
          clusters,
          count: response.data.count || 0,
          itsData: response.data.itsData,
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

  // Updated onboard cluster mutation using both query parameter and request body for safety
  const useOnboardCluster = () => {
    return useMutation({
      mutationFn: async (clusterData: ClusterOnboardData) => {
        const clusterName = clusterData.clusterName;

        // Log the request payload for debugging
        console.log('[DEBUG] Cluster onboard request payload:', {
          url: `/clusters/onboard?name=${encodeURIComponent(clusterName)}`,
          method: 'POST',
          data: { clusterName: clusterName },
          headers: { 'Content-Type': 'application/json' },
        });

        // Using both query parameter and request body for safety:
        // 1. Query parameter: /clusters/onboard?name={clustername}
        // 2. JSON body: { "clusterName": "{clustername}" }
        const response = await api.post(
          `/clusters/onboard?name=${encodeURIComponent(clusterName)}`,
          { clusterName: clusterName },
          { headers: { 'Content-Type': 'application/json' } }
        );

        // Log the response for debugging
        console.log('[DEBUG] Cluster onboard response:', response.data);

        return response.data;
      },
      onSuccess: () => {
        console.log(
          '[DEBUG] Cluster onboard mutation successful, invalidating clusters query cache'
        );
        queryClient.invalidateQueries({ queryKey: ['clusters'] });
      },
      onError: error => {
        console.error('[DEBUG] Cluster onboard mutation error:', error);
      },
    });
  };

  const useGenerateOnboardCommand = () => {
    return useMutation({
      mutationFn: async (clusterName: string) => {
        const response = await api.post('/clusters/manual/generateCommand', {
          clusterName,
        });
        return response.data;
      },
    });
  };

  // Update cluster labels mutation
  const useUpdateClusterLabels = () => {
    return useMutation({
      mutationFn: async ({
        contextName,
        clusterName,
        labels,
      }: {
        contextName: string;
        clusterName: string;
        labels: { [key: string]: string };
      }) => {
        console.log('[DEBUG] Updating cluster labels:', {
          contextName,
          clusterName,
          labels,
        });

        const response = await api.patch(
          '/api/managedclusters/labels',
          {
            contextName,
            clusterName,
            labels,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('[DEBUG] Update labels response:', response.data);
        return response.data;
      },
      onSuccess: () => {
        console.log('[DEBUG] Labels updated successfully, invalidating clusters query cache');
        queryClient.invalidateQueries({ queryKey: ['clusters'] });
      },
      onError: error => {
        console.error('[DEBUG] Error updating cluster labels:', error);
      },
    });
  };

  // Detach cluster mutation
  const useDetachCluster = () => {
    return useMutation({
      mutationFn: async (clusterName: string) => {
        console.log('[DEBUG] Detaching cluster:', clusterName);
        const response = await api.post('/clusters/detach', {
          clusterName,
        });
        return response.data;
      },
      onSuccess: () => {
        console.log('[DEBUG] Cluster detach successful, invalidating clusters query cache');
        queryClient.invalidateQueries({ queryKey: ['clusters'] });
      },
      onError: error => {
        console.error('[DEBUG] Cluster detach mutation error:', error);
      },
    });
  };

  // Fetch details for a specific cluster
  const useClusterDetails = (clusterName: string) => {
    return useQuery({
      queryKey: ['cluster-details', clusterName],
      queryFn: async (): Promise<ClusterDetails> => {
        const response = await api.get(`/api/clusters/${clusterName}`);
        return response.data;
      },
      enabled: !!clusterName,
      staleTime: 1000 * 60,
    });
  };

  return {
    useClusters,
    useClusterStatus,
    useImportCluster,
    useOnboardCluster,
    useUpdateClusterLabels,
    useGenerateOnboardCommand,
    useDetachCluster,
    useClusterDetails,
  };
};
