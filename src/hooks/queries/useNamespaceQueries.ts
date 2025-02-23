import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface Namespace {
  name: string;
  status: string;
  creationTimestamp: string;
}

export const useNamespaceQueries = () => {
  const queryClient = useQueryClient();

  // Get all namespaces
  const useNamespaces = () => {
    return useQuery({
      queryKey: ['namespaces'],
      queryFn: async (): Promise<Namespace[]> => {
        const response = await api.get('/api/namespaces');
        return response.data;
      },
    });
  };

  // Get namespace details
  const useNamespaceDetails = (name: string) => {
    return useQuery({
      queryKey: ['namespace', name],
      queryFn: async () => {
        const response = await api.get(`/api/namespaces/${name}`);
        return response.data;
      },
      enabled: !!name,
    });
  };

  // Create namespace mutation
  const useCreateNamespace = () => {
    return useMutation({
      mutationFn: async (namespaceData: any) => {
        const response = await api.post('/api/namespaces/create', namespaceData);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['namespaces'] });
      },
    });
  };

  // Update namespace mutation
  const useUpdateNamespace = () => {
    return useMutation({
      mutationFn: async ({ name, data }: { name: string; data: any }) => {
        const response = await api.put(`/api/namespaces/update/${name}`, data);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['namespaces'] });
      },
    });
  };

  // Delete namespace mutation
  const useDeleteNamespace = () => {
    return useMutation({
      mutationFn: async (name: string) => {
        const response = await api.delete(`/api/namespaces/delete/${name}`);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['namespaces'] });
      },
    });
  };

  return {
    useNamespaces,
    useNamespaceDetails,
    useCreateNamespace,
    useUpdateNamespace,
    useDeleteNamespace,
  };
}; 