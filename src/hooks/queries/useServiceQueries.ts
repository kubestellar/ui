import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface Service {
  namespace: string;
  name: string;
  // Add other service properties
}

export const useServiceQueries = () => {
  const queryClient = useQueryClient();

  // Get services by namespace
  const useServices = (namespace: string) =>
    useQuery({
      queryKey: ['services', namespace],
      queryFn: async () => {
        const response = await api.get(`/api/services/${namespace}`);
        return response.data;
      },
      enabled: Boolean(namespace),
    });

  // Get service details
  const useServiceDetails = (namespace: string, name: string) =>
    useQuery({
      queryKey: ['service', namespace, name],
      queryFn: async () => {
        const response = await api.get(`/api/services/${namespace}/${name}`);
        return response.data;
      },
      enabled: Boolean(namespace && name),
    });

  // Create service mutation
  const useCreateService = () =>
    useMutation({
      mutationFn: async (serviceData: Service) => {
        const response = await api.post('/api/services/create', serviceData);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['services'] });
      },
    });

  // Delete service mutation
  const useDeleteService = () =>
    useMutation({
      mutationFn: async ({ namespace, name }: { namespace: string; name: string }) => {
        const response = await api.delete('/api/services/delete', {
          data: { namespace, name },
        });
        return response.data;
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ 
          queryKey: ['services', variables.namespace] 
        });
      },
    });

  return {
    useServices,
    useServiceDetails,
    useCreateService,
    useDeleteService,
  };
}; 