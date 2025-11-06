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

  // ITS specific scenarios
  itsSuccess: [
    h.login,
    h.me,
    h.clusters, // Normal clusters response
    h.k8sInfo,
    h.importCluster,
    h.onboardCluster,
    h.generateOnboardCommand,
    h.updateClusterLabels,
    h.detachCluster,
  ],

  // ITS action scenarios
  itsLabelsSuccess: [
    h.login,
    h.me,
    h.clusters,
    h.k8sInfo,
    h.updateClusterLabelsSuccess, // Successful label updates
    h.importCluster,
    h.onboardCluster,
    h.generateOnboardCommand,
    h.detachCluster,
  ],

  itsImportSuccess: [
    h.login,
    h.me,
    h.clusters,
    h.k8sInfo,
    h.importClusterSuccess, // Successful import
    h.onboardCluster,
    h.generateOnboardCommand,
    h.updateClusterLabels,
    h.detachCluster,
  ],

  itsImportError: [
    h.login,
    h.me,
    h.clusters,
    h.k8sInfo,
    h.importClusterError, // Failed import
    h.onboardCluster,
    h.generateOnboardCommand,
    h.updateClusterLabels,
    h.detachCluster,
  ],

  itsDetachSuccess: [
    h.login,
    h.me,
    h.clusters,
    h.k8sInfo,
    h.importCluster,
    h.onboardCluster,
    h.generateOnboardCommand,
    h.updateClusterLabels,
    h.detachClusterSuccess, // Successful detach
  ],

  itsPagination: [
    h.login,
    h.me,
    h.clustersPaginated, // Paginated clusters for testing
    h.k8sInfo,
    h.importCluster,
    h.onboardCluster,
    h.generateOnboardCommand,
    h.updateClusterLabels,
    h.detachCluster,
  ],

  itsLoading: [
    h.login,
    h.me,
    h.clustersDelayed, // Delayed response for loading states
    h.k8sInfo,
    h.importCluster,
    h.onboardCluster,
    h.generateOnboardCommand,
    h.updateClusterLabels,
    h.detachCluster,
  ],

  // WDS specific success scenario
  wdsSuccess: [
    h.statusReady,
    h.statusReadyRel,
    h.me,
    h.workloads,
    h.workloadsRel,
    h.workloadStatus,
    h.workloadStatusRel,
    h.wdsGetContextAbs,
    h.wdsGetContextRel,
  ],
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
