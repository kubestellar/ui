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
        containers: {
          image: string;
        }[];
      };
    };
  };
}

export const useWDSQueries = () => {
  const queryClient = useQueryClient();

  // Fetch all workloads
  const useWorkloads = (): UseQueryResult<Workload[], Error> => 
    useQuery({
      queryKey: ['workloads'],
      queryFn: async (): Promise<Workload[]> => {
        try {
          const response = await api.get('/api/wds/workloads');
          return response.data;
        } catch (error: any) {
          console.error('Error fetching workloads:', error.response?.data || error.message);
          throw new Error(error.response?.data?.message || 'Failed to fetch workloads');
        }
      },
      staleTime: 5000, // Data considered fresh for 5 seconds
      cacheTime: 300000, // Cache for 5 minutes
    });

  // Get workload/deployment details
  const useWorkloadDetails = (name: string, namespace: string) =>
    useQuery({
      queryKey: ['workload', namespace, name],
      queryFn: async () => {
        try {
          const response = await api.get(`/api/wds/${name}`, {
            params: { namespace },
          });
          return response.data;
        } catch (error: any) {
          console.error('Error fetching workload details:', error.response?.data || error.message);
          throw new Error(error.response?.data?.message || 'Failed to fetch workload details');
        }
      },
      enabled: !!name && !!namespace,
      retry: 1,
    });

  // Get workload status - Updated with better error handling
  const useWorkloadStatus = () =>
    useQuery({
      queryKey: ['workload-status'],
      queryFn: async () => {
        try {
          // First try the specific workload status endpoint
          const response = await api.get('/api/wds/status');
          return response.data;
        } catch (error: any) {
          console.error('Detailed status error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
          });
          
          // If the specific endpoint fails, we'll return an empty array
          // This allows the UI to continue functioning even if status fails
          return [];
        }
      },
      retry: 2,
      retryDelay: 1000,
      // If status fails, we don't want to break the entire UI
      useErrorBoundary: false,
      // Return empty array on error
      onError: () => {
        return [];
      },
      staleTime: 5000,
      cacheTime: 300000,
    });

  // Create workload mutation - Updated with better error handling and validation
  const useCreateWorkload = () =>
    useMutation({
      mutationFn: async ({ data, isJson = false }: { data: any; isJson?: boolean }) => {
        try {
          // Validate input data
          if (!data) {
            throw new Error('No data provided');
          }

          // Log the request for debugging
          console.log('Creating workload with:', { data, isJson });

          const endpoint = isJson ? '/api/wds/create/json' : '/api/wds/create';
          const response = await api.post(endpoint, data);

          // Log the response for debugging
          console.log('Create workload response:', response.data);

          return response.data;
        } catch (error: any) {
          console.error('Error creating workload:', {
            error: error.response?.data || error.message,
            status: error.response?.status,
            data: error.response?.data
          });
          throw new Error(error.response?.data?.message || 'Failed to create workload');
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['workloads'] });
        toast.success('Workload created successfully');
      },
      onError: (error: Error) => {
        toast.error(error.message);
      }
    });

  // Update workload mutation
  const useUpdateWorkload = () =>
    useMutation({
      mutationFn: async (deployment: DeploymentConfig) => {
        try {
          const response = await api.put('/api/wds/update', deployment);
          return response.data;
        } catch (error: any) {
          console.error('Error updating workload:', error.response?.data || error.message);
          throw new Error(error.response?.data?.message || 'Failed to update workload');
        }
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ 
          queryKey: ['workloads'],
          exact: true 
        });
        toast.success('Workload updated successfully');
      },
      onError: (error: Error) => {
        toast.error(error.message);
      },
    });

  // Scale workload mutation
  const useScaleWorkload = () =>
    useMutation({
      mutationFn: async ({ namespace, name, replicas }: { namespace: string; name: string; replicas: number }) => {
        try {
          const response = await api.put('/api/wds/update', { 
            metadata: { namespace, name },
            spec: { replicas }
          });
          return response.data;
        } catch (error: any) {
          console.error('Error scaling workload:', error.response?.data || error.message);
          throw new Error(error.response?.data?.message || 'Failed to scale workload');
        }
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ 
          queryKey: ['workloads'],
          exact: true 
        });
        queryClient.invalidateQueries({ 
          queryKey: ['workload', variables.namespace, variables.name] 
        });
        toast.success(`Scaled workload to ${variables.replicas} replicas`);
      },
      onError: (error: Error) => {
        toast.error(error.message);
      },
    });

  // Delete workload mutation
  const useDeleteWorkload = () =>
    useMutation({
      mutationFn: async ({ namespace, name }: { namespace: string; name: string }) => {
        try {
          const response = await api.delete('/api/wds/delete', {
            data: { namespace, name },
          });
          return response.data;
        } catch (error: any) {
          console.error('Error deleting workload:', error.response?.data || error.message);
          throw new Error(error.response?.data?.message || 'Failed to delete workload');
        }
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ 
          queryKey: ['workloads'],
          exact: true 
        });
        queryClient.invalidateQueries({ 
          queryKey: ['workload', variables.namespace, variables.name] 
        });
        toast.success('Workload deleted successfully');
      },
      onError: (error: Error) => {
        toast.error(error.message);
      },
    });

  // Get workload logs
  const useWorkloadLogs = (options?: { 
    namespace: string; 
    podName: string;
    containerName?: string;
    tailLines?: number;
    follow?: boolean;
  }) =>
    useQuery({
      queryKey: ['workload-logs', options],
      queryFn: async () => {
        const response = await api.get('/api/wds/logs', { params: options });
        return response.data;
      },
      enabled: !!options?.namespace && !!options?.podName,
      refetchInterval: options?.follow ? 1000 : false,
    });

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