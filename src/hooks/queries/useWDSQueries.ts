import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { AxiosError } from 'axios';

interface Workload {
  name: string;
  kind: string;
  namespace: string;
  creationTime: string;
  image: string;
  labels: Record<string, string>;
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

// Define a more specific type for the workload data in mutations
interface WorkloadData {
  kind?: string;
  metadata?: {
    namespace?: string;
    name?: string;
    [key: string]: unknown;
  };
  spec?: {
    replicas?: number;
    selector?: Record<string, unknown>;
    template?: {
      metadata?: Record<string, unknown>;
      spec?: {
        containers?: Array<{
          name?: string;
          image?: string;
          ports?: Array<Record<string, unknown>>;
          [key: string]: unknown;
        }>;
        [key: string]: unknown;
      };
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
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

  // POST /api/{resourcekind}/{ns}
  const useCreateWorkload = () =>
    useMutation({
      mutationFn: async ({ data }: { data: WorkloadData }) => {
        // Extract 'kind' and 'namespace' from the raw data
        const kind = data.kind?.toLowerCase() || "deployment"; // Default to 'deployment' if not present
        const namespace = data.metadata?.namespace || "default"; // Default to 'default' if not present

        // Construct the dynamic endpoint (e.g., /api/deployments/default)
        const endpoint = `/api/${kind}s/${namespace}`; // Pluralize 'kind' (e.g., 'deployment' -> 'deployments')

        // Send the full raw data to the backend
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

  // Updated mutation for file uploads with custom headers and auto_ns query parameter
  const useUploadWorkloadFile = () =>
    useMutation({
      mutationFn: async ({ data, autoNs }: { data: FormData; autoNs: boolean }) => { // Added autoNs parameter
        const response = await api.post(`/api/resource/upload?auto_ns=${autoNs}`, data, {
          headers: {
            // Override the default Content-Type to let Axios handle multipart/form-data
            'Content-Type': 'multipart/form-data', // Explicitly set to ensure compatibility
          },
        });
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['workloads'] });
        toast.success('File uploaded successfully');
      },
      onError: (error: AxiosError) => {
        toast.error('Failed to upload file');
        console.error('Error uploading file:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
          config: error.config, // Log the full config for debugging
        });
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
    useUploadWorkloadFile, 
    useUpdateWorkload,
    useScaleWorkload,
    useDeleteWorkload,
    useWorkloadLogs,
  };
};