import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { BindingPolicyInfo } from '../../types/bindingPolicy';

export const useBPQueries = () => {
  const queryClient = useQueryClient();

  // GET /api/bp - Fetch all binding policies
  const useBindingPolicies = () => {
    const queryResult = useQuery<BindingPolicyInfo[], Error>({
      queryKey: ['binding-policies'],
      queryFn: async () => {
        const response = await api.get('/api/bp');
        return response.data;
      },
    });

    if (queryResult.error) {
      toast.error('Failed to fetch binding policies');
      console.error('Error fetching binding policies:', queryResult.error);
    }

    return queryResult;
  };

  // POST /api/bp/create - Create binding policy
  const useCreateBindingPolicy = () => {
    return useMutation({
      mutationFn: async (policyData: Omit<BindingPolicyInfo, 'creationDate' | 'clusters' | 'status'>) => {
        const response = await api.post('/api/bp/create', policyData);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['binding-policies'] });
        toast.success('Binding policy created successfully');
      },
      onError: (error: Error) => {
        toast.error('Failed to create binding policy');
        console.error('Error creating binding policy:', error);
      },
    });
  };

  // DELETE /api/bp/delete/:name - Delete specific binding policy
  const useDeleteBindingPolicy = () => {
    return useMutation({
      mutationFn: async (name: string) => {
        const response = await api.delete(`/api/bp/delete/${name}`);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['binding-policies'] });
        toast.success('Binding policy deleted successfully');
      },
      onError: (error: Error) => {
        toast.error('Failed to delete binding policy');
        console.error('Error deleting binding policy:', error);
      },
    });
  };

  // DELETE /api/bp/delete - Delete multiple binding policies
  const useDeletePolicies = () => {
    return useMutation({
      mutationFn: async (policies: string[]) => {
        const response = await api.delete('/api/bp/delete', {
          data: { policies },
        });
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['binding-policies'] });
        toast.success('Selected binding policies deleted successfully');
      },
      onError: (error: Error) => {
        toast.error('Failed to delete binding policies');
        console.error('Error deleting binding policies:', error);
      },
    });
  };

  // POST /api/deploy - Deploy binding policies
  const useDeploy = () => {
    return useMutation({
      mutationFn: async (deployData: unknown) => {
        const response = await api.post('/api/deploy', deployData);
        return response.data;
      },
      onSuccess: () => {
        toast.success('Deployment completed successfully');
      },
      onError: (error: Error) => {
        toast.error('Deployment failed');
        console.error('Error during deployment:', error);
      },
    });
  };

  return {
    useBindingPolicies,
    useCreateBindingPolicy,
    useDeleteBindingPolicy,
    useDeletePolicies,
    useDeploy,
  };
};