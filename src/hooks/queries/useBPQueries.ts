import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { BindingPolicyInfo } from '../../types/bindingPolicy';

export const useBPQueries = () => {
  const queryClient = useQueryClient();

  // Fetch all binding policies
  const useBindingPolicies = () => {
    return useQuery({
      queryKey: ['binding-policies'],
      queryFn: async (): Promise<BindingPolicyInfo[]> => {
        const response = await api.get('/api/bp');
        return response.data;
      },
    });
  };

  // Create binding policy
  const useCreateBindingPolicy = () => {
    return useMutation({
      mutationFn: async (policyData: Omit<BindingPolicyInfo, 'creationDate' | 'clusters' | 'status'>) => {
        const response = await api.post('/api/bp/create', policyData);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['binding-policies'] });
      },
    });
  };

  // Delete binding policy
  const useDeleteBindingPolicy = () => {
    return useMutation({
      mutationFn: async (name: string) => {
        const response = await api.delete(`/api/bp/delete/${name}`);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['binding-policies'] });
      },
    });
  };

  // Delete all binding policies
  const useDeleteAllBindingPolicies = () => {
    return useMutation({
      mutationFn: async () => {
        const response = await api.delete('/api/bp/delete');
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['binding-policies'] });
      },
    });
  };

  return {
    useBindingPolicies,
    useCreateBindingPolicy,
    useDeleteBindingPolicy,
    useDeleteAllBindingPolicies,
  };
}; 