import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('http://localhost:4000/api/kubestellar/status', () => {
    return HttpResponse.json({ allReady: true });
  }),
  http.get('http://localhost:4000/health', () => {
    return HttpResponse.json({ status: 'ok' });
  }),
  http.get('http://localhost:4000/api/prerequisites', () => {
    return HttpResponse.json({
      status: 'ok',
      prerequisites: [
        { name: 'kubeflex', installed: true, version: '0.8.0' },
        { name: 'clusteradm', installed: true, version: '0.10.0' },
        { name: 'helm', installed: true, version: '3.12.0' },
        { name: 'kubectl', installed: true, version: '1.28.0' },
        { name: 'kind', installed: true, version: '0.20.0' },
        { name: 'docker', installed: true, version: '24.0.0' },
      ],
    });
  }),
  http.post('http://localhost:4000/login', async ({ request }) => {
    type LoginRequest = {
      username: string;
      password: string;
    };

    const body = (await request.json()) as LoginRequest;
    const { username, password } = body;

    if (username === 'admin' && password === 'admin') {
      return HttpResponse.json({
        success: true,
        token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwiaXNfYWRtaW4iOnRydWUsInBlcm1pc3Npb25zIjp7ImRhc2hib2FyZCI6IndyaXRlIiwicmVzb3VyY2VzIjoid3JpdGUiLCJzeXN0ZW0iOiJ3cml0ZSIsInVzZXJzIjoid3JpdGUifSwiZXhwIjoxNzU5NDAyMTY5LCJpYXQiOjE3NTkzMTU3Njl9.gJ65X-eWc-wVpcYkIsCh6akhainX3NrQwWWJtkNpxvs',
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
  }),
  http.get('http://localhost:4000/api/new/clusters', () => {
    return HttpResponse.json({
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
            version: {
              kubernetes: 'v1.27.3',
            },
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
            version: {
              kubernetes: 'v1.27.3',
            },
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
    });
  }),
  http.get('http://localhost:4000/api/bp', () => {
    return HttpResponse.json({ bindingPolicies: [], count: 0 });
  }),
  http.get('http://localhost:4000/api/wds/workloads', () => {
    return HttpResponse.json([
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
    ]);
  }),
  http.get('http://localhost:4000/api/me', () => {
    return HttpResponse.json({
      is_admin: true,
      permissions: {
        dashboard: 'write',
        resources: 'write',
        system: 'write',
        users: 'write',
      },
      username: 'admin',
    });
  }),
];
