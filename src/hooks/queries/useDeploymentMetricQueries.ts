import { api } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';

interface GitHubStats {
  count: number;
  webhook: number;
  manual: number;
  failed: number;
}

interface HelmStats {
  count: number;
  active: number;
  failed: number;
  succeeded: number;
}

interface DeploymentStatus {
  github: GitHubStats;
  helm: HelmStats;
  total: number;
}

interface DeploymentMetricsResponse {
  status: DeploymentStatus;
}

const fetchDeploymentMetrics = async () => {
  const response = await api.get('/api/metrics/deployments');
  return response.data;
};

export const useDeploymentMetrics = () => {
  return useQuery<DeploymentMetricsResponse, Error>({
    queryKey: ['deployment-metrics'],
    queryFn: fetchDeploymentMetrics,
  });
};
