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
    h.statusReady,
    h.statusReadyRel,
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
    h.statusReady,
    h.statusReadyRel,
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
    h.statusReady,
    h.statusReadyRel,
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
    h.statusReady,
    h.statusReadyRel,
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
    h.statusReady,
    h.statusReadyRel,
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
    h.statusReady,
    h.statusReadyRel,
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
    h.statusReady,
    h.statusReadyRel,
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
    h.login,
    h.me,
    h.statusReady,
    h.statusReadyRel,
    h.workloads,
    h.workloadsRel,
    h.workloadStatus,
    h.workloadStatusRel,
    h.wdsGetContextAbs,
    h.wdsGetContextRel,
    h.k8sInfo,
  ],

  // WECS tree view scenario
  wecsSuccess: [
    h.login,
    h.me,
    h.wecsTreeView,
    h.wecsTreeViewRel,
    h.clusterDetails,
    h.getPods,
    h.getDeployments,
    h.getServices,
    h.getNamespaces,
    h.getClusterNamespaces,
  ],

  // WDS context filtering scenario
  wdsContextFiltering: [
    h.statusReady,
    h.statusReadyRel,
    h.me,
    h.workloads,
    h.workloadsRel,
    h.workloadStatus,
    h.workloadStatusRel,
    h.wdsGetContextAbsMultiple,
    h.wdsGetContextMultiple,
    h.wdsCreateContext,
  ],

  // User Management specific scenario
  userManagement: [
    h.login,
    h.me,
    h.statusReady,
    h.statusReadyRel,
    h.userActivities,
    h.createUser,
    h.updateUser,
    h.updateUserPermissions,
    h.getUserPermissions,
    h.deleteUser,
  ],

  // Object Explorer specific scenario
  objectExplorerSuccess: [
    h.login,
    h.me,
    h.statusReady,
    h.statusReadyRel,
    h.getResourceKinds,
    h.getNamespaces,
    h.getPods,
    h.getDeployments,
    h.getServices,
    h.getClusterNamespaces,
  ],

  // Binding Policy specific scenario
  bindingPolicy: [
    h.login,
    h.me,
    h.statusReady,
    h.statusReadyRel,
    h.clusters,
    h.workloads,
    h.workloadsRel,
    h.bindingPolicies,
    h.k8sInfo,
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
