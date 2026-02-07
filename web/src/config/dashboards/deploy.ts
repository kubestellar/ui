/**
 * Deploy Dashboard Configuration
 */
import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const deployDashboardConfig: UnifiedDashboardConfig = {
  id: 'deploy',
  name: 'Deploy',
  subtitle: 'Workload deployment and management',
  route: '/deploy',
  statsType: 'deploy',
  cards: [
    // Top row: Workloads, Cluster Groups, Missions (1/3 each)
    { id: 'workload-deployment-1', cardType: 'workload_deployment', title: 'Workloads', position: { w: 4, h: 4 } },
    { id: 'cluster-groups-1', cardType: 'cluster_groups', title: 'Cluster Groups', position: { w: 4, h: 4 } },
    { id: 'deployment-missions-1', cardType: 'deployment_missions', title: 'Deployment Missions', position: { w: 4, h: 4 } },
    // Resource Marshall
    { id: 'resource-marshall-1', cardType: 'resource_marshall', title: 'Resource Marshall', position: { w: 6, h: 4 } },
    // Deployment Status
    { id: 'deployment-status-1', cardType: 'deployment_status', title: 'Deployment Status', position: { w: 6, h: 4 } },
    { id: 'deployment-progress-1', cardType: 'deployment_progress', title: 'Deployment Progress', position: { w: 5, h: 4 } },
    { id: 'deployment-issues-1', cardType: 'deployment_issues', title: 'Deployment Issues', position: { w: 6, h: 4 } },
    // GitOps
    { id: 'gitops-drift-1', cardType: 'gitops_drift', title: 'GitOps Drift', position: { w: 6, h: 4 } },
    { id: 'argocd-apps-1', cardType: 'argocd_applications', title: 'ArgoCD Applications', position: { w: 6, h: 4 } },
    { id: 'argocd-sync-1', cardType: 'argocd_sync_status', title: 'ArgoCD Sync Status', position: { w: 6, h: 4 } },
    { id: 'argocd-health-1', cardType: 'argocd_health', title: 'ArgoCD Health', position: { w: 6, h: 4 } },
    // Helm
    { id: 'helm-release-1', cardType: 'helm_release_status', title: 'Helm Releases', position: { w: 6, h: 4 } },
    { id: 'helm-history-1', cardType: 'helm_history', title: 'Helm History', position: { w: 8, h: 4 } },
    { id: 'chart-versions-1', cardType: 'chart_versions', title: 'Chart Versions', position: { w: 6, h: 4 } },
    // Kustomize
    { id: 'kustomization-1', cardType: 'kustomization_status', title: 'Kustomization Status', position: { w: 6, h: 4 } },
    { id: 'overlay-1', cardType: 'overlay_comparison', title: 'Overlay Comparison', position: { w: 6, h: 4 } },
  ],
  features: {
    dragDrop: true,
    addCard: true,
    autoRefresh: true,
    autoRefreshInterval: 30000,
  },
  storageKey: 'kubestellar-deploy-cards',
}

export default deployDashboardConfig
