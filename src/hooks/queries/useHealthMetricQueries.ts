import { api } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'unhealthy';
  uptime: string;
  responseTime: string;
  lastChecked: string;
}

interface ComponentStatus {
  status: string;
  last_checked: string;
  error?: string;
  details?: string;
}

interface HealthResponse {
  overall_status: string;
  timestamp: string;
  components: {
    redis: ComponentStatus;
    kubernetes: ComponentStatus;
    github_api: ComponentStatus;
  };
  summary: {
    healthy_components: number;
    total_components: number;
    health_percentage: number;
  };
}

const transformHealthData = (data: HealthResponse): ServiceStatus[] => {
  const services: ServiceStatus[] = [];

  if (data.components.redis) {
    services.push({
      name: 'Redis Cache',
      status: data.components.redis.status === 'healthy' ? 'healthy' : 'unhealthy',
      uptime: '99.9%',
      responseTime: '10ms',
      lastChecked: new Date(data.components.redis.last_checked).toLocaleTimeString(),
    });
  }

  if (data.components.kubernetes) {
    services.push({
      name: 'Kubernetes API',
      status: data.components.kubernetes.status === 'healthy' ? 'healthy' : 'unhealthy',
      uptime: '99.9%',
      responseTime: '50ms',
      lastChecked: new Date(data.components.kubernetes.last_checked).toLocaleTimeString(),
    });
  }

  if (data.components.github_api) {
    services.push({
      name: 'GitHub API',
      status:
        data.components.github_api.status === 'healthy' ||
        data.components.github_api.status === 'not_configured'
          ? 'healthy'
          : 'unhealthy',
      uptime: '99.9%',
      responseTime: '200ms',
      lastChecked: new Date(data.components.github_api.last_checked).toLocaleTimeString(),
    });
  }

  return services;
};

export const useHealthMetrics = () => {
  return useQuery<
    HealthResponse,
    Error,
    {
      services: ServiceStatus[];
      healthPercentage: number;
      components: HealthResponse['components'];
      timestamp: string;
    }
  >({
    queryKey: ['health-metrics'],
    queryFn: async () => {
      const response = await api.get('/api/metrics/health');
      return response.data;
    },
    select: data => ({
      services: transformHealthData(data),
      healthPercentage: data.summary.health_percentage,
      components: data.components,
      timestamp: data.timestamp,
    }),
    refetchInterval: 30000,
  });
};
