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

export const defaultHandlers: HttpHandler[] = [
  statusReady,
  health,
  prerequisites,
  login,
  clusters,
  bindingPolicies,
  workloads,
  me,
];
