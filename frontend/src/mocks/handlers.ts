import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('http://localhost:4000/api/kubestellar/status', () => {
    return HttpResponse.json({ allReady: false });
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
];
