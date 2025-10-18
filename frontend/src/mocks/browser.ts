import { setupWorker } from 'msw/browser';
import * as h from './handlers';

import type { HttpHandler } from 'msw';

export const worker = setupWorker(...h.defaultHandlers);

export const scenarios: Record<string, HttpHandler[]> = {
  default: h.defaultHandlers,
  statusReady: [h.statusReady],
  statusNotReady: [h.statusNotReady],
  login: [h.login],
  dashboard: [
    h.k8sInfo,
    h.clusterMetrics,
    h.podHealth,
    h.userActivities,
    h.deletedUserActivities,
    h.clusterDetails,
    h.clusterStatus,
    h.workloadStatus,
    h.workloadLogs,
    h.workloadDetails,
    h.clusters,
    h.bindingPolicies,
    h.workloads,
    h.me,
  ],
  metrics: [h.clusterMetrics, h.podHealth, h.k8sInfo],
  userActivity: [h.userActivities, h.deletedUserActivities, h.me],
  clusterDetails: [h.clusterDetails, h.clusterStatus, h.clusters],
  workloadDetails: [h.workloadDetails, h.workloadStatus, h.workloadLogs, h.workloads],
};

export function applyScenarioByName(name: string) {
  const s = scenarios[name];
  if (Array.isArray(s) && s.length) {
    worker.use(...s);
    console.log('[MSW] applied scenario:', name);
  } else {
    console.warn('[MSW] scenario not found or empty:', name);
  }
}

declare global {
  interface Window {
    __msw?: {
      applyScenarioByName: typeof applyScenarioByName;
      scenarios: typeof scenarios;
      worker: typeof worker;
    };
  }
}

if (typeof window !== 'undefined') {
  window.__msw = {
    worker,
    scenarios,
    applyScenarioByName,
  };
}
