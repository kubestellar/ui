import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const useDeployQueries = () => {
  const queryClient = useQueryClient();

  // Deploy application mutation
  const useDeploy = () => {
    return useMutation({
      mutationFn: async (deployData: any) => {
        const response = await api.post('/api/deploy', deployData);
        return response.data;
      },
      onSuccess: () => {
        // Invalidate relevant queries after successful deployment
        queryClient.invalidateQueries({ queryKey: ['workloads'] });
        queryClient.invalidateQueries({ queryKey: ['services'] });
      },
    });
  };

  return {
    useDeploy,
  };
}; 