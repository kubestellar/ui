import { api } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';

interface ComponentStatus {
  status: string;
  last_checked: string;
  error: string;
  details: string;
}

interface SystemMetricsResponse {
  timestamp: string;
  uptime: string;
  version: string;
  components: {
    [key: string]: ComponentStatus;
  };
}

const fetchSystemMetrics = async () => {
  const response = await api.get('/api/metrics/system');
  return response.data;
};

export const useSystemMetrics = () => {
  return useQuery<SystemMetricsResponse, Error>({
    queryKey: ['system-metrics'],
    queryFn: fetchSystemMetrics,
  });
};