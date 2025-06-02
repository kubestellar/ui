import type { Plugin, CacheInfo, AvailablePlugin, PluginConfiguration } from '../types/plugin';

export const demoPlugins: Plugin[] = [
  {
    metadata: {
      id: 'cluster-ops-plugin',
      name: 'KubeStellar Cluster Operations',
      version: '1.0.0',
      description: 'Real cluster onboarding and detachment operations using handlers.go',
      author: 'Priyanshu',
      endpoints: [
        {
          path: '/api/plugins/cluster-ops-plugin/onboard',
          method: 'POST',
          handler: 'OnboardClusterHandler',
        },
        {
          path: '/api/plugins/cluster-ops-plugin/detach',
          method: 'POST',
          handler: 'DetachClusterHandler',
        },
        {
          path: '/api/plugins/cluster-ops-plugin/status/:cluster',
          method: 'GET',
          handler: 'GetClusterStatusHandler',
        },
        {
          path: '/api/plugins/cluster-ops-plugin/clusters',
          method: 'GET',
          handler: 'ListClustersHandler',
        },
        {
          path: '/api/plugins/cluster-ops-plugin/health',
          method: 'GET',
          handler: 'HealthCheckHandler',
        },
        {
          path: '/api/plugins/cluster-ops-plugin/events/:cluster',
          method: 'GET',
          handler: 'GetClusterEventsHandler',
        },
      ],
      permissions: ['cluster.read', 'cluster.write', 'cluster.delete'],
      dependencies: ['kubectl', 'clusteradm'],
      configuration: {
        timeout: '60s',
        cluster_namespace: 'kubestellar-system',
        its_context: 'its1',
      },
      security: {
        network_access: true,
        filesystem_access: true,
        sandboxed: true,
      },
      health: {
        enabled: true,
        interval_seconds: 30,
      },
    },
    status: {
      id: 'cluster-ops-plugin',
      status: 'enabled',
      health: 'healthy',
      uptime: 3600,
      last_updated: new Date().toISOString(),
      request_count: 45,
      error_count: 0,
    },
    source: '/plugins/cluster-ops-plugin.so',
    loaded_at: new Date(Date.now() - 3600000).toISOString(),
    file_path: '/plugins/cluster-ops-plugin.so',
    enabled: true,
  },
  {
    metadata: {
      id: 'backup-plugin',
      name: 'Backup & Recovery Plugin',
      version: '1.5.2',
      description: 'Automated backup and recovery solutions for Kubernetes resources',
      author: 'Enterprise Solutions',
      endpoints: [
        { path: '/api/backup/create', method: 'POST', handler: 'CreateBackup' },
        { path: '/api/backup/restore', method: 'POST', handler: 'RestoreBackup' },
        { path: '/api/backup/schedule', method: 'POST', handler: 'ScheduleBackup' },
      ],
      permissions: ['backup:create', 'backup:restore', 'storage:access'],
      dependencies: ['velero-client', 'storage-driver'],
      configuration: {
        storage_backend: 's3',
        compression: true,
        encryption: true,
      },
      security: {
        network_access: true,
        filesystem_access: true,
        sandboxed: true,
      },
      health: {
        enabled: true,
        interval_seconds: 120,
      },
    },
    status: {
      id: 'backup-plugin',
      status: 'failed',
      health: 'unhealthy',
      uptime: 1800,
      last_updated: new Date(Date.now() - 600000).toISOString(),
      request_count: 89,
      error_count: 15,
      error_message: 'Storage backend connection failed',
    },
    source: '/opt/plugins/backup-plugin.so',
    loaded_at: new Date(Date.now() - 1800000).toISOString(),
    file_path: '/opt/plugins/backup-plugin.so',
    enabled: false,
  },
];

export const demoCacheInfo: CacheInfo = {
  total_size: '0MB',
  num_entries: 0,
  hit_rate: 0,
  last_cleanup: new Date().toISOString(),
};

export const demoAvailablePlugins: AvailablePlugin[] = [];

export const demoHealthSummary = {
  plugins: [
    {
      id: 'cluster-ops-plugin',
      status: 'enabled' as const,
      health: 'healthy' as const,
      uptime: 3600,
      last_updated: new Date().toISOString(),
      request_count: 45,
      error_count: 0,
    },
    {
      id: 'backup-plugin',
      status: 'failed' as const,
      health: 'unhealthy' as const,
      uptime: 1800,
      last_updated: new Date(Date.now() - 600000).toISOString(),
      request_count: 89,
      error_count: 15,
      error_message: 'Storage backend connection failed',
    },
  ],
};

export const demoConfiguration: PluginConfiguration = {
  cache_enabled: true,
  cache_max_size: '1GB',
  security_enabled: true,
};
