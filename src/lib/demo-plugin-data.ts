import type {
  Plugin,
  SystemMetrics,
  CacheInfo,
  AvailablePlugin,
  PluginConfiguration,
} from '../types/plugin';

export const demoPlugins: Plugin[] = [
  {
    metadata: {
      id: 'cluster-plugin',
      name: 'Cluster Management Plugin',
      version: '1.0.0',
      description: 'Provides cluster onboarding and detachment functionality for KubeStellar',
      author: 'KubeStellar Team',
      endpoints: [
        { path: '/api/clusters/onboard', method: 'POST', handler: 'OnboardCluster' },
        { path: '/api/clusters/detach', method: 'POST', handler: 'DetachCluster' },
        { path: '/api/clusters/status', method: 'GET', handler: 'GetClusterStatus' },
      ],
      permissions: ['cluster:read', 'cluster:write', 'cluster:delete'],
      dependencies: ['kubernetes-client', 'yaml-parser'],
      configuration: {
        timeout: '30s',
        retries: 3,
        validate_ssl: true,
      },
      security: {
        network_access: true,
        filesystem_access: false,
        sandboxed: true,
      },
      health: {
        enabled: true,
        interval_seconds: 30,
      },
      ui_components: [
        { name: 'ClusterOnboardForm', route: '/clusters/onboard', component: 'ClusterOnboardForm' },
        {
          name: 'ClusterStatusDashboard',
          route: '/clusters/status',
          component: 'ClusterStatusDashboard',
        },
      ],
    },
    status: {
      id: 'cluster-plugin',
      status: 'enabled',
      health: 'healthy',
      uptime: 3600,
      last_updated: new Date().toISOString(),
      request_count: 1250,
      error_count: 3,
    },
    source: 'https://github.com/kubestellar/cluster-plugin',
    loaded_at: new Date(Date.now() - 3600000).toISOString(),
    file_path: '/opt/plugins/cluster-plugin.so',
    enabled: true,
  },
  {
    metadata: {
      id: 'monitoring-plugin',
      name: 'Monitoring & Metrics Plugin',
      version: '2.1.0',
      description: 'Advanced monitoring and metrics collection for distributed workloads',
      author: 'Community',
      endpoints: [
        { path: '/api/metrics/collect', method: 'POST', handler: 'CollectMetrics' },
        { path: '/api/metrics/query', method: 'GET', handler: 'QueryMetrics' },
        { path: '/api/alerts/create', method: 'POST', handler: 'CreateAlert' },
      ],
      permissions: ['metrics:read', 'metrics:write', 'alerts:manage'],
      dependencies: ['prometheus-client', 'grafana-sdk'],
      configuration: {
        scrape_interval: '15s',
        retention: '7d',
        alert_threshold: 0.8,
      },
      security: {
        network_access: true,
        filesystem_access: true,
        sandboxed: false,
      },
      health: {
        enabled: true,
        interval_seconds: 60,
      },
    },
    status: {
      id: 'monitoring-plugin',
      status: 'enabled',
      health: 'healthy',
      uptime: 7200,
      last_updated: new Date(Date.now() - 300000).toISOString(),
      request_count: 5420,
      error_count: 12,
    },
    source: 'https://github.com/community/monitoring-plugin',
    loaded_at: new Date(Date.now() - 7200000).toISOString(),
    file_path: '/opt/plugins/monitoring-plugin.so',
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

export const demoSystemMetrics: SystemMetrics = {
  total_plugins: 3,
  active_plugins: 2,
  failed_plugins: 1,
  total_requests: 6759,
  avg_response_time: 145,
  uptime: '2h 15m',
  memory_usage: '256MB',
};

export const demoCacheInfo: CacheInfo = {
  total_size: '1.2GB',
  num_entries: 15,
  hit_rate: 0.87,
  last_cleanup: new Date(Date.now() - 86400000).toISOString(),
};

export const demoAvailablePlugins: AvailablePlugin[] = [
  {
    name: 'Security Scanner Plugin',
    description:
      'Comprehensive security scanning and vulnerability assessment for Kubernetes clusters',
    author: 'Security Team',
    repository: 'https://github.com/kubestellar/security-scanner',
    latest_version: '3.2.1',
    stars: 245,
    last_updated: new Date(Date.now() - 172800000).toISOString(),
    download_url:
      'https://github.com/kubestellar/security-scanner/releases/download/v3.2.1/security-scanner.so',
  },
  {
    name: 'Cost Optimization Plugin',
    description: 'Intelligent cost analysis and optimization recommendations for cloud resources',
    author: 'FinOps Community',
    repository: 'https://github.com/finops/cost-optimizer',
    latest_version: '2.0.5',
    stars: 189,
    last_updated: new Date(Date.now() - 259200000).toISOString(),
    download_url:
      'https://github.com/finops/cost-optimizer/releases/download/v2.0.5/cost-optimizer.so',
  },
  {
    name: 'Network Policy Manager',
    description:
      'Advanced network policy management and visualization for multi-cluster environments',
    author: 'Network Team',
    repository: 'https://github.com/network/policy-manager',
    latest_version: '1.8.3',
    stars: 156,
    last_updated: new Date(Date.now() - 432000000).toISOString(),
    download_url:
      'https://github.com/network/policy-manager/releases/download/v1.8.3/policy-manager.so',
  },
  {
    name: 'GitOps Integration Plugin',
    description: 'Seamless GitOps workflow integration with ArgoCD and Flux support',
    author: 'DevOps Community',
    repository: 'https://github.com/gitops/integration-plugin',
    latest_version: '4.1.0',
    stars: 312,
    last_updated: new Date(Date.now() - 86400000).toISOString(),
    download_url:
      'https://github.com/gitops/integration-plugin/releases/download/v4.1.0/gitops-integration.so',
  },
];

export const demoHealthSummary = {
  plugins: [
    {
      id: 'cluster-plugin',
      status: 'enabled' as const,
      health: 'healthy' as const,
      uptime: 3600,
      last_updated: new Date().toISOString(),
      request_count: 1250,
      error_count: 3,
    },
    {
      id: 'monitoring-plugin',
      status: 'enabled' as const,
      health: 'healthy' as const,
      uptime: 7200,
      last_updated: new Date(Date.now() - 300000).toISOString(),
      request_count: 5420,
      error_count: 12,
    },
    {
      id: 'backup-plugin',
      status: 'failed' as const,
      health: 'unhealthy' as const,
      uptime: 1800,
      last_updated: new Date(Date.now() - 600000).toISOString(),
      request_count: 89,
      error_count: 15,
    },
  ],
};

export const demoConfiguration: PluginConfiguration = {
  cache_enabled: true,
  cache_max_size: '1GB',
  health_check_interval: '30s',
  max_concurrent_loads: 3,
  plugin_timeout: '30s',
  security_enabled: true,
};
