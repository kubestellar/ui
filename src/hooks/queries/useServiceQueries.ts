import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const useServiceQueries = () => {
  const queryClient = useQueryClient();

  // Get services by namespace
  const useServices = (namespace: string) => {
    return useQuery({
      queryKey: ['services', namespace],
      queryFn: async () => {
        const response = await api.get(`/api/services/${namespace}`);
        return response.data;
      },
    });
  };

  // Get service details
  const useServiceDetails = (namespace: string, name: string) => {
    return useQuery({
      queryKey: ['service', namespace, name],
      queryFn: async () => {
        const response = await api.get(`/api/services/${namespace}/${name}`);
        return response.data;
      },
    });
  };

  // Create service mutation
  const useCreateService = () => {
    return useMutation({
      mutationFn: async (serviceData: any) => {
        const response = await api.post('/api/services/create', serviceData);
        return response.data;
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['services'] });
      },
    });
  };

  // Delete service mutation
  const useDeleteService = () => {
    return useMutation({
      mutationFn: async (serviceData: any) => {
        const response = await api.delete('/api/services/delete', { data: serviceData });
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['services'] });
      },
    });
  };

  return {
    useServices,
    useServiceDetails,
    useCreateService,
    useDeleteService,
  };
}; 