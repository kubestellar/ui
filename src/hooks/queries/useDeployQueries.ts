import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface DeploymentData {
  name: string;
  namespace: string;
  manifests?: unknown[];
  // Add other properties as needed
}

export const useDeployQueries = () => {
  const queryClient = useQueryClient();

  // Deploy application mutation
  const useDeploy = () => {
    return useMutation({
      mutationFn: async (deployData: DeploymentData) => {
        const response = await api.post('/api/deploy', deployData);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['deployments'] });
      },
    });
  };

  return {
    useDeploy,
  };
};
