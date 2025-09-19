import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/kubestellar/status', () => {
    return HttpResponse.json({ allReady: false });
  }),
  http.get('/api/prerequisites', () => {
    return HttpResponse.json({
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
];
