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
  const useNamespaces = () =>
    useQuery({
      queryKey: ['namespaces'],
      queryFn: async () => {
        const response = await api.get('/api/namespaces');
        return response.data;
      },
    });

  // Get namespace details
  const useNamespaceDetails = (name: string) =>
    useQuery({
      queryKey: ['namespace', name],
      queryFn: async () => {
        const response = await api.get(`/api/namespaces/${name}`);
        return response.data;
      },
      enabled: Boolean(name),
    });

  // Create namespace mutation
  const useCreateNamespace = () =>
    useMutation({
      mutationFn: async (namespaceData: Namespace) => {
        const response = await api.post('/api/namespaces/create', namespaceData);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['namespaces'] });
      },
    });

  // Update namespace mutation
  const useUpdateNamespace = () =>
    useMutation({
      mutationFn: async ({ name, data }: { name: string; data: Partial<Namespace> }) => {
        const response = await api.put(`/api/namespaces/update/${name}`, data);
        return response.data;
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['namespaces'] });
        queryClient.invalidateQueries({ queryKey: ['namespace', variables.name] });
      },
    });

  // Delete namespace mutation
  const useDeleteNamespace = () =>
    useMutation({
      mutationFn: async (name: string) => {
        const response = await api.delete(`/api/namespaces/delete/${name}`);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['namespaces'] });
      },
    });

  return {
    useNamespaces,
    useNamespaceDetails,
    useCreateNamespace,
    useUpdateNamespace,
    useDeleteNamespace,
  };
}; 