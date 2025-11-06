// src/mocks/handlers.ts
import { http, HttpResponse, HttpHandler } from 'msw';

/**
 * Individual handlers — export them so they can be used in scenarios.
 * Use absolute URLs (matching your frontend requests) or patterns if needed.
 */

export const statusReady: HttpHandler = http.get(
  'http://localhost:4000/api/kubestellar/status',
  () => HttpResponse.json({ allReady: true })
);

export const statusNotReady: HttpHandler = http.get(
  'http://localhost:4000/api/kubestellar/status',
  () => HttpResponse.json({ allReady: false })
);

export const health: HttpHandler = http.get('http://localhost:4000/health', () =>
  HttpResponse.json({ status: 'ok' })
);

export const prerequisites: HttpHandler = http.get('http://localhost:4000/api/prerequisites', () =>
  HttpResponse.json({
    status: 'ok',
    prerequisites: [
      { name: 'kubeflex', installed: true, version: '0.8.0' },
      { name: 'clusteradm', installed: true, version: '0.10.0' },
      { name: 'helm', installed: true, version: '3.12.0' },
      { name: 'kubectl', installed: true, version: '1.28.0' },
      { name: 'kind', installed: true, version: '0.20.0' },
      { name: 'docker', installed: true, version: '24.0.0' },
    ],
  })
);

export const login: HttpHandler = http.post('http://localhost:4000/login', async ({ request }) => {
  type LoginRequest = {
    username: string;
    password: string;
  };

  const body = (await request.json()) as LoginRequest;
  const { username, password } = body;

  if (username === 'admin' && password === 'admin') {
    return HttpResponse.json({
      success: true,
      token: 'xyz..',
      user: {
        is_admin: true,
        permissions: {
          dashboard: 'write',
          resources: 'write',
          system: 'write',
          users: 'write',
        },
        username: 'admin',
      },
    });
  }

  return HttpResponse.json(
    {
      success: false,
      message: 'Invalid username or password',
    },
    { status: 401 }
  );
});

export const clusters: HttpHandler = http.get('http://localhost:4000/api/new/clusters', () =>
  HttpResponse.json({
    clusters: [
      {
        name: 'cluster1',
        uid: 'b1d0f9e5-a7ae-42ed-8a57-01698bbdd187',
        creationTimestamp: '2025-09-16T14:50:22+05:30',
        labels: {
          'cluster.open-cluster-management.io/clusterset': 'default',
          'feature.open-cluster-management.io/addon-addon-status': 'available',
          'location-group': 'edge',
          name: 'cluster1',
        },
        status: {
          conditions: [
            {
              lastTransitionTime: '2025-09-16T09:20:38Z',
              message: 'Accepted by hub cluster admin',
              reason: 'HubClusterAdminAccepted',
              status: 'True',
              type: 'HubAcceptedManagedCluster',
            },
            {
              lastTransitionTime: '2025-09-16T09:20:39Z',
              message: 'Managed cluster joined',
              reason: 'ManagedClusterJoined',
              status: 'True',
              type: 'ManagedClusterJoined',
            },
            {
              lastTransitionTime: '2025-10-01T12:50:26Z',
              message: 'Managed cluster is available',
              reason: 'ManagedClusterAvailable',
              status: 'True',
              type: 'ManagedClusterConditionAvailable',
            },
            {
              lastTransitionTime: '2025-09-16T09:20:39Z',
              message: 'The clock of the managed cluster is synced with the hub.',
              reason: 'ManagedClusterClockSynced',
              status: 'True',
              type: 'ManagedClusterConditionClockSynced',
            },
          ],
          version: { kubernetes: 'v1.27.3' },
          capacity: {
            cpu: '16',
            'ephemeral-storage': '1055762868Ki',
            'hugepages-1Gi': '0',
            'hugepages-2Mi': '0',
            memory: '7940284Ki',
            pods: '110',
          },
        },
        available: true,
        joined: true,
      },
      {
        name: 'cluster2',
        uid: 'd6d3c94e-ba10-474c-a2ad-c10eab170b81',
        creationTimestamp: '2025-09-16T14:51:25+05:30',
        labels: {
          'cluster.open-cluster-management.io/clusterset': 'default',
          'feature.open-cluster-management.io/addon-addon-status': 'available',
          'location-group': 'edge',
          name: 'cluster2',
        },
        status: {
          conditions: [
            {
              lastTransitionTime: '2025-09-16T09:21:41Z',
              message: 'Accepted by hub cluster admin',
              reason: 'HubClusterAdminAccepted',
              status: 'True',
              type: 'HubAcceptedManagedCluster',
            },
            {
              lastTransitionTime: '2025-09-16T09:21:43Z',
              message: 'Managed cluster joined',
              reason: 'ManagedClusterJoined',
              status: 'True',
              type: 'ManagedClusterJoined',
            },
            {
              lastTransitionTime: '2025-10-01T12:50:22Z',
              message: 'Managed cluster is available',
              reason: 'ManagedClusterAvailable',
              status: 'True',
              type: 'ManagedClusterConditionAvailable',
            },
            {
              lastTransitionTime: '2025-09-16T09:21:43Z',
              message: 'The clock of the managed cluster is synced with the hub.',
              reason: 'ManagedClusterClockSynced',
              status: 'True',
              type: 'ManagedClusterConditionClockSynced',
            },
          ],
          version: { kubernetes: 'v1.27.3' },
          capacity: {
            cpu: '16',
            'ephemeral-storage': '1055762868Ki',
            'hugepages-1Gi': '0',
            'hugepages-2Mi': '0',
            memory: '7940284Ki',
            pods: '110',
          },
        },
        available: true,
        joined: true,
      },
    ],
    count: 2,
  })
);

// Additional ITS API handlers for complete MSW coverage
export const updateClusterLabelsSuccess: HttpHandler = http.patch(
  'http://localhost:4000/api/managedclusters/labels',
  () =>
    HttpResponse.json({
      success: true,
      message: 'Labels updated successfully',
    })
);

export const importClusterSuccess: HttpHandler = http.post(
  'http://localhost:4000/clusters/import',
  () =>
    HttpResponse.json({
      success: true,
      message: 'Cluster imported successfully',
    })
);

export const importClusterError: HttpHandler = http.post(
  'http://localhost:4000/clusters/import',
  () => HttpResponse.json({ error: 'Invalid cluster configuration' }, { status: 400 })
);

export const detachClusterSuccess: HttpHandler = http.post(
  'http://localhost:4000/clusters/detach',
  () =>
    HttpResponse.json({
      success: true,
      message: 'Cluster detached successfully',
    })
);

// Paginated clusters for testing pagination
export const clustersPaginated: HttpHandler = http.get(
  'http://localhost:4000/api/new/clusters',
  ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = 10;

    // Generate clusters for pagination testing
    const totalClusters = 25;
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalClusters);

    const clusters = [];
    for (let i = startIndex; i < endIndex; i++) {
      clusters.push({
        name: `cluster-${i + 1}`,
        uid: `uid-${i + 1}`,
        creationTimestamp: '2024-01-15T10:30:00Z',
        labels: { environment: 'test', page: page.toString() },
        status: { conditions: [], capacity: {} },
        available: true,
        joined: true,
      });
    }

    return HttpResponse.json({
      clusters,
      count: totalClusters,
      page,
      totalPages: Math.ceil(totalClusters / pageSize),
    });
  }
);

// Delayed response for loading state testing
export const clustersDelayed: HttpHandler = http.get(
  'http://localhost:4000/api/new/clusters',
  async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return HttpResponse.json({
      clusters: [
        {
          name: 'cluster1',
          uid: 'uid-1',
          creationTimestamp: '2024-01-15T10:30:00Z',
          labels: { environment: 'test' },
          status: { conditions: [], capacity: {} },
          available: true,
          joined: true,
        },
      ],
      count: 1,
    });
  }
);

export const bindingPolicies: HttpHandler = http.get('http://localhost:4000/api/bp', () =>
  HttpResponse.json({ bindingPolicies: [], count: 0 })
);

export const workloads: HttpHandler = http.get('http://localhost:4000/api/wds/workloads', () =>
  HttpResponse.json([
    {
      name: 'kubernetes',
      kind: 'Service',
      namespace: 'default',
      creationTime: '2025-09-16T14:42:14+05:30',
      labels: {
        component: 'apiserver',
        provider: 'kubernetes',
      },
    },
  ])
);

// Relative aliases for WDS (frontend often calls relative URLs)
export const workloadsRel: HttpHandler = http.get('/api/wds/workloads', () =>
  HttpResponse.json([
    {
      name: 'kubernetes',
      kind: 'Service',
      namespace: 'default',
      creationTime: new Date().toISOString(),
      labels: { component: 'apiserver', provider: 'kubernetes' },
    },
  ])
);

export const me: HttpHandler = http.get('http://localhost:4000/api/me', () =>
  HttpResponse.json({
    is_admin: true,
    permissions: {
      dashboard: 'write',
      resources: 'write',
      system: 'write',
      users: 'write',
    },
    username: 'admin',
  })
);

// K8s Info endpoint - provides contexts, clusters, and current context
export const k8sInfo: HttpHandler = http.get('http://localhost:4000/api/clusters', () =>
  HttpResponse.json({
    contexts: [
      { name: 'its1-kubeflex', current: true },
      { name: 'its2-kubeflex', current: false },
      { name: 'default', current: false },
    ],
    clusters: [],
    currentContext: 'its1-kubeflex',
  })
);

// Cluster resource metrics endpoint
export const clusterMetrics: HttpHandler = http.get(
  'http://localhost:4000/api/metrics/cluster-resources',
  () =>
    HttpResponse.json({
      overallCPU: 45.2,
      overallMemory: 67.8,
      activeClusters: 2,
      totalClusters: 2,
      contexts: [
        {
          name: 'its1-kubeflex',
          cpu: 45.2,
          memory: 67.8,
          pods: 12,
        },
        {
          name: 'its2-kubeflex',
          cpu: 38.5,
          memory: 72.1,
          pods: 8,
        },
      ],
    })
);

// Pod health metrics endpoint
export const podHealth: HttpHandler = http.get(
  'http://localhost:4000/api/metrics/pod-health',
  ({ request }) => {
    const url = new URL(request.url);
    const context = url.searchParams.get('context');

    // Return different data based on context
    if (context === 'its1-kubeflex') {
      return HttpResponse.json({
        context: 'its1-kubeflex',
        totalPods: 12,
        healthyPods: 11,
        healthPercent: 92,
        pods: [
          { name: 'kubestellar-core', status: 'Running', namespace: 'kubestellar-system' },
          { name: 'kubeflex-controller', status: 'Running', namespace: 'kubeflex-system' },
          { name: 'postgresql', status: 'Running', namespace: 'kubestellar-system' },
        ],
      });
    } else if (context === 'its2-kubeflex') {
      return HttpResponse.json({
        context: 'its2-kubeflex',
        totalPods: 8,
        healthyPods: 7,
        healthPercent: 88,
        pods: [
          { name: 'kubestellar-core', status: 'Running', namespace: 'kubestellar-system' },
          { name: 'kubeflex-controller', status: 'Running', namespace: 'kubeflex-system' },
        ],
      });
    }

    // Default response
    return HttpResponse.json({
      context: context || 'default',
      totalPods: 5,
      healthyPods: 4,
      healthPercent: 80,
      pods: [],
    });
  }
);

// User activities endpoint
export const userActivities: HttpHandler = http.get('http://localhost:4000/api/admin/users', () =>
  HttpResponse.json({
    users: [
      {
        username: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: 'user1',
        created_at: new Date(Date.now() - 60000).toISOString(),
        updated_at: new Date(Date.now() - 60000).toISOString(),
      },
      {
        username: 'user2',
        created_at: new Date(Date.now() - 120000).toISOString(),
        updated_at: new Date(Date.now() - 120000).toISOString(),
      },
    ],
  })
);

// Deleted user activities endpoint
export const deletedUserActivities: HttpHandler = http.get(
  'http://localhost:4000/api/admin/users/deleted',
  () =>
    HttpResponse.json({
      deleted_users: [
        {
          username: 'temp-user',
          deleted_at: new Date(Date.now() - 180000).toISOString(), // 3 minutes ago
        },
        {
          username: 'test-user',
          deleted_at: new Date(Date.now() - 240000).toISOString(), // 4 minutes ago
        },
      ],
    })
);

// Cluster details endpoint for specific cluster
export const clusterDetails: HttpHandler = http.get(
  'http://localhost:4000/api/clusters/:clusterName',
  ({ params }) => {
    const { clusterName } = params;

    return HttpResponse.json({
      name: clusterName as string,
      uid: 'b1d0f9e5-a7ae-42ed-8a57-01698bbdd187',
      creationTimestamp: '2025-09-16T14:50:22+05:30',
      labels: {
        'cluster.open-cluster-management.io/clusterset': 'default',
        'feature.open-cluster-management.io/addon-addon-status': 'available',
        'location-group': 'edge',
        name: clusterName as string,
      },
      status: {
        conditions: [
          {
            lastTransitionTime: '2025-09-16T09:20:38Z',
            message: 'Accepted by hub cluster admin',
            reason: 'HubClusterAdminAccepted',
            status: 'True',
            type: 'HubAcceptedManagedCluster',
          },
          {
            lastTransitionTime: '2025-09-16T09:20:39Z',
            message: 'Managed cluster joined',
            reason: 'ManagedClusterJoined',
            status: 'True',
            type: 'ManagedClusterJoined',
          },
          {
            lastTransitionTime: '2025-10-01T12:50:26Z',
            message: 'Managed cluster is available',
            reason: 'ManagedClusterAvailable',
            status: 'True',
            type: 'ManagedClusterConditionAvailable',
          },
        ],
        version: { kubernetes: 'v1.27.3' },
        capacity: {
          cpu: '16',
          'ephemeral-storage': '1055762868Ki',
          'hugepages-1Gi': '0',
          'hugepages-2Mi': '0',
          memory: '7940284Ki',
          pods: '110',
        },
      },
      available: true,
      joined: true,
    });
  }
);

// Cluster status endpoint
export const clusterStatus: HttpHandler = http.get('http://localhost:4000/clusters/status', () =>
  HttpResponse.json([
    { name: 'cluster1', status: 'Active', message: 'Cluster is running normally' },
    { name: 'cluster2', status: 'Active', message: 'Cluster is running normally' },
  ])
);

// Workload status endpoint
export const workloadStatus: HttpHandler = http.get('http://localhost:4000/api/wds/status', () =>
  HttpResponse.json([
    {
      name: 'kubernetes-service',
      status: 'Running',
      namespace: 'default',
      kind: 'Service',
      lastUpdated: '2025-01-15T10:30:00Z',
    },
    {
      name: 'nginx-deployment',
      status: 'Running',
      namespace: 'default',
      kind: 'Deployment',
      lastUpdated: '2025-01-15T09:15:00Z',
    },
  ])
);

export const workloadStatusRel: HttpHandler = http.get('/api/wds/status', () =>
  HttpResponse.json([
    { name: 'kubernetes-service', status: 'Running', namespace: 'default', kind: 'Service' },
  ])
);

// Workload logs endpoint
export const workloadLogs: HttpHandler = http.get(
  'http://localhost:4000/api/wds/logs',
  ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    const namespace = url.searchParams.get('namespace');

    return HttpResponse.json({
      logs: [
        `[2025-01-15T10:30:00Z] ${name} in ${namespace}: Application started successfully`,
        `[2025-01-15T10:29:45Z] ${name} in ${namespace}: Initializing components`,
        `[2025-01-15T10:29:30Z] ${name} in ${namespace}: Loading configuration`,
      ],
      name: name || 'unknown',
      namespace: namespace || 'default',
    });
  }
);

// Workload details endpoint
export const workloadDetails: HttpHandler = http.get(
  'http://localhost:4000/api/wds/:name',
  ({ params, request }) => {
    const { name } = params;
    const url = new URL(request.url);
    const namespace = url.searchParams.get('namespace') || 'default';

    return HttpResponse.json({
      name: name as string,
      namespace: namespace,
      kind: 'Service',
      creationTime: '2025-09-16T14:42:14+05:30',
      labels: {
        component: 'apiserver',
        provider: 'kubernetes',
      },
      spec: {
        type: 'ClusterIP',
        ports: [{ port: 443, targetPort: 6443, protocol: 'TCP' }],
      },
      status: {
        loadBalancer: {},
      },
    });
  }
);

// Context endpoints (absolute and relative)
export const wdsGetContextAbs: HttpHandler = http.get('http://localhost:4000/wds/get/context', () =>
  HttpResponse.json({
    'ui-wds-context': 'wds1',
    'system-context': 'wds1',
    'other-wds-context': ['wds1', 'wds2'],
  })
);

export const wdsGetContextRel: HttpHandler = http.get('/wds/get/context', () =>
  HttpResponse.json({
    'ui-wds-context': 'wds1',
    'system-context': 'wds1',
    'other-wds-context': ['wds1', 'wds2'],
  })
);

// Relative status for Kubestellar install check
export const statusReadyRel: HttpHandler = http.get('/api/kubestellar/status', () =>
  HttpResponse.json({ allReady: true })
);

// ITS Page - Import cluster
export const importCluster: HttpHandler = http.post(
  'http://localhost:4000/clusters/import',
  async ({ request }) => {
    const body = (await request.json()) as {
      clusterName: string;
      Region: string;
      node: string;
      value: string[];
    };

    return HttpResponse.json({
      success: true,
      message: `Cluster ${body.clusterName} imported successfully`,
      clusterName: body.clusterName,
    });
  }
);

// ITS Page - Onboard cluster
export const onboardCluster: HttpHandler = http.post(
  'http://localhost:4000/clusters/onboard',
  async ({ request }) => {
    const url = new URL(request.url);
    const clusterNameFromQuery = url.searchParams.get('name');

    let clusterNameFromBody = '';
    try {
      const body = (await request.json()) as { clusterName?: string };
      clusterNameFromBody = body.clusterName || '';
    } catch {
      // Body might not be JSON
    }

    const clusterName = clusterNameFromQuery || clusterNameFromBody;

    if (!clusterName) {
      return HttpResponse.json({ error: 'Cluster name is required' }, { status: 400 });
    }

    return HttpResponse.json({
      success: true,
      message: `Cluster ${clusterName} onboarding initiated successfully`,
      clusterName,
    });
  }
);

// ITS Page - Generate onboard command
export const generateOnboardCommand: HttpHandler = http.post(
  'http://localhost:4000/clusters/manual/generateCommand',
  async ({ request }) => {
    const body = (await request.json()) as { clusterName: string };

    if (!body.clusterName) {
      return HttpResponse.json({ error: 'Cluster name is required' }, { status: 400 });
    }

    return HttpResponse.json({
      command: `clusteradm join --hub-token=mock-token-xyz --hub-apiserver=https://hub.example.com --cluster-name=${body.clusterName}`,
      clusterName: body.clusterName,
      success: true,
    });
  }
);

// ITS Page - Update cluster labels
export const updateClusterLabels: HttpHandler = http.patch(
  'http://localhost:4000/api/managedclusters/labels',
  async ({ request }) => {
    const body = (await request.json()) as {
      contextName: string;
      clusterName: string;
      labels: { [key: string]: string };
    };

    if (!body.clusterName) {
      return HttpResponse.json({ error: 'Cluster name is required' }, { status: 400 });
    }

    return HttpResponse.json({
      success: true,
      message: `Labels updated for cluster ${body.clusterName}`,
      clusterName: body.clusterName,
      labels: body.labels,
    });
  }
);

// ITS Page - Detach cluster
export const detachCluster: HttpHandler = http.post(
  'http://localhost:4000/clusters/detach',
  async ({ request }) => {
    const body = (await request.json()) as { clusterName: string };

    if (!body.clusterName) {
      return HttpResponse.json({ error: 'Cluster name is required' }, { status: 400 });
    }

    return HttpResponse.json({
      success: true,
      message: `Cluster ${body.clusterName} detached successfully`,
      clusterName: body.clusterName,
    });
  }
);

export const defaultHandlers: HttpHandler[] = [
  statusReady,
  statusReadyRel,
  health,
  prerequisites,
  login,
  clusters,
  bindingPolicies,
  workloads,
  workloadsRel,
  me,
  k8sInfo,
  clusterMetrics,
  podHealth,
  userActivities,
  deletedUserActivities,
  clusterDetails,
  clusterStatus,
  workloadStatus,
  workloadStatusRel,
  workloadLogs,
  workloadDetails,
  importCluster,
  onboardCluster,
  generateOnboardCommand,
  updateClusterLabels,
  detachCluster,
  wdsGetContextAbs,
  wdsGetContextRel,
];
