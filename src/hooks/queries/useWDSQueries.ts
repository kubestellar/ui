import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';

interface Workload {
  name: string;
  kind: string;
  namespace: string;
  creationTime: string;
  image: string;
  label: string;
  replicas: number;
  status?: string;
}

interface DeploymentConfig {
  metadata: {
    namespace: string;
    name: string;
  };
  spec: {
    replicas?: number;
    template: {
      spec: {
        containers: Array<{
          image: string;
          name?: string;
          resources?: Record<string, unknown>;
        }>;
      };
    };
  };
}

interface WorkloadLogsOptions {
  namespace: string;
  podName: string;
  containerName?: string;
  tailLines?: number;
  follow?: boolean;
}

// Define a proper interface for the workload details
interface WorkloadDetail {
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp: string;
    // other metadata fields
  };
  spec: {
    replicas?: number;
    template: {
      spec: {
        containers: Array<{
          image: string;
          name?: string;
          resources?: Record<string, unknown>;
        }>;
      };
    };
  };
  status: {
    availableReplicas?: number;
    readyReplicas?: number;
    replicas?: number;
    // other status fields
  };
}

interface WorkloadStatus {
  name: string;
  namespace: string;
  status: string;
  message?: string;
  // other status fields
}

export const useWDSQueries = () => {
  const queryClient = useQueryClient();

  // GET /api/wds/workloads
  const useWorkloads = (): UseQueryResult<Workload[], Error> => {
    const query = useQuery<Workload[], Error>({
      queryKey: ['workloads'],
      queryFn: async () => {
        const response = await api.get<Workload[]>('/api/wds/workloads');
        return response.data;
      },
      staleTime: 5000,
      gcTime: 300000,
    });
    
    if (query.error) {
      toast.error('Failed to fetch workloads');
      console.error('Error fetching workloads:', query.error);
    }
    
    return query;
  };

  // GET /api/wds/:name
  const useWorkloadDetails = (name: string, namespace: string) => {
    const query = useQuery<WorkloadDetail, Error>({
      queryKey: ['workload', namespace, name],
      queryFn: async () => {
        const response = await api.get(`/api/wds/${name}`, {
          params: { namespace },
        });
        return response.data;
      },
      enabled: Boolean(name && namespace),
      retry: 1,
    });
    
    if (query.error) {
      toast.error('Failed to fetch workload details');
      console.error('Error fetching workload details:', query.error);
    }
    
    return query;
  };

  // GET /api/wds/status
  const useWorkloadStatus = () => {
    const query = useQuery<WorkloadStatus[], Error>({
      queryKey: ['workload-status'],
      queryFn: async () => {
        const response = await api.get('/api/wds/status');
        return response.data;
      },
      retry: 2,
      retryDelay: 1000,
      staleTime: 5000,
      gcTime: 300000,
    });
    
    if (query.error) {
      console.warn('Status fetch failed:', query.error);
    }
    
    return query;
  };

  // POST /api/wds/create and POST /api/wds/create/json
  const useCreateWorkload = () =>
    useMutation({
      mutationFn: async ({ data, isJson = false }: { data: DeploymentConfig | unknown; isJson: boolean }) => {
        const endpoint = isJson ? '/api/wds/create/json' : '/api/wds/create';
        const response = await api.post(endpoint, data);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['workloads'] });
        toast.success('Workload created successfully');
      },
      onError: (error: Error) => {
        toast.error('Failed to create workload');
        console.error('Error creating workload:', error);
      },
    });

  // PUT /api/wds/update
  const useUpdateWorkload = () =>
    useMutation({
      mutationFn: async (deployment: DeploymentConfig) => {
        const response = await api.put('/api/wds/update', deployment);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['workloads'] });
        toast.success('Workload updated successfully');
      },
      onError: (error: Error) => {
        toast.error('Failed to update workload');
        console.error('Error updating workload:', error);
      },
    });

  // Scale operation using PUT /api/wds/update
  const useScaleWorkload = () =>
    useMutation({
      mutationFn: async ({ 
        namespace, 
        name, 
        replicas 
      }: { 
        namespace: string; 
        name: string; 
        replicas: number;
      }) => {
        const response = await api.put('/api/wds/update', {
          metadata: { namespace, name },
          spec: { replicas },
        });
        return response.data;
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['workloads'] });
        queryClient.invalidateQueries({ 
          queryKey: ['workload', variables.namespace, variables.name] 
        });
        toast.success(`Scaled workload to ${variables.replicas} replicas`);
      },
      onError: (error: Error) => {
        toast.error('Failed to scale workload');
        console.error('Error scaling workload:', error);
      },
    });

  // DELETE /api/wds/delete
  const useDeleteWorkload = () =>
    useMutation({
      mutationFn: async ({ namespace, name }: { namespace: string; name: string }) => {
        const response = await api.delete('/api/wds/delete', {
          data: { namespace, name },
        });
        return response.data;
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['workloads'] });
        queryClient.invalidateQueries({ 
          queryKey: ['workload', variables.namespace, variables.name] 
        });
        toast.success('Workload deleted successfully');
      },
      onError: (error: Error) => {
        toast.error('Failed to delete workload');
        console.error('Error deleting workload:', error);
      },
    });

  // GET /api/wds/logs
  const useWorkloadLogs = (options: WorkloadLogsOptions) => {
    const query = useQuery<string, Error>({
      queryKey: ['workload-logs', options],
      queryFn: async () => {
        const response = await api.get('/api/wds/logs', { params: options });
        return response.data;
      },
      enabled: Boolean(options?.namespace && options?.podName),
      refetchInterval: options?.follow ? 1000 : false,
    });
    
    if (query.error) {
      toast.error('Failed to fetch workload logs');
      console.error('Error fetching workload logs:', query.error);
    }
    
    return query;
  };

  return {
    useWorkloads,
    useWorkloadDetails,
    useWorkloadStatus,
    useCreateWorkload,
    useUpdateWorkload,
    useScaleWorkload,
    useDeleteWorkload,
    useWorkloadLogs,
  };
};