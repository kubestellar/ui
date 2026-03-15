/**
 * Card Configuration Registry - Auto-generated
 */

import type { UnifiedCardConfig, CardConfigRegistry } from '../../lib/unified/types'

import { activeAlertsConfig } from './active-alerts'
import { alertRulesConfig } from './alert-rules'
import { appStatusConfig } from './app-status'
import { argocdApplicationsConfig } from './argocd-applications'
import { argocdHealthConfig } from './argocd-health'
import { argocdSyncStatusConfig } from './argocd-sync-status'
import { certManagerConfig } from './cert-manager'
import { chartVersionsConfig } from './chart-versions'
import { checkersConfig } from './checkers'
import { clusterComparisonConfig } from './cluster-comparison'
import { clusterCostsConfig } from './cluster-costs'
import { clusterFocusConfig } from './cluster-focus'
import { clusterGroupsConfig } from './cluster-groups'
import { clusterHealthConfig } from './cluster-health'
import { clusterHealthMonitorConfig } from './cluster-health-monitor'
import { clusterLocationsConfig } from './cluster-locations'
import { clusterMetricsConfig } from './cluster-metrics'
import { clusterNetworkConfig } from './cluster-network'
import { clusterResourceTreeConfig } from './cluster-resource-tree'
import { complianceScoreConfig } from './compliance-score'
import { computeOverviewConfig } from './compute-overview'
import { configMapStatusConfig } from './configmap-status'
import { consoleAiHealthCheckConfig } from './console-ai-health-check'
import { consoleAiIssuesConfig } from './console-ai-issues'
import { consoleAiKubeconfigAuditConfig } from './console-ai-kubeconfig-audit'
import { consoleAiOfflineDetectionConfig } from './console-ai-offline-detection'
import { containerTetrisConfig } from './container-tetris'
import { crdHealthConfig } from './crd-health'
import { cronJobStatusConfig } from './cronjob-status'
import { daemonSetStatusConfig } from './daemonset-status'
import { deploymentIssuesConfig } from './deployment-issues'
import { deploymentMissionsConfig } from './deployment-missions'
import { deploymentProgressConfig } from './deployment-progress'
import { deploymentStatusConfig } from './deployment-status'
import { dynamicCardConfig } from './dynamic-card'
import { eventStreamConfig } from './event-stream'
import { eventSummaryConfig } from './event-summary'
import { eventsTimelineConfig } from './events-timeline'
import { externalSecretsConfig } from './external-secrets'
import { falcoAlertsConfig } from './falco-alerts'
import { flappyPodConfig } from './flappy-pod'
import { game2048Config } from './game-2048'
import { gatewayStatusConfig } from './gateway-status'
import { githubActivityConfig } from './github-activity'
import { githubCiMonitorConfig } from './github-ci-monitor'
import { gitopsDriftConfig } from './gitops-drift'
import { gpuInventoryConfig } from './gpu-inventory'
import { gpuOverviewConfig } from './gpu-overview'
import { gpuStatusConfig } from './gpu-status'
import { gpuUsageTrendConfig } from './gpu-usage-trend'
import { gpuUtilizationConfig } from './gpu-utilization'
import { gpuWorkloadsConfig } from './gpu-workloads'
import { hardwareHealthConfig } from './hardware-health'
import { helmHistoryConfig } from './helm-history'
import { helmReleaseStatusConfig } from './helm-release-status'
import { helmValuesDiffConfig } from './helm-values-diff'
import { hpaStatusConfig } from './hpa-status'
import { iframeEmbedConfig } from './iframe-embed'
import { ingressStatusConfig } from './ingress-status'
import { jobStatusConfig } from './job-status'
import { kubeChessConfig } from './kube-chess'
import { kubeCraftConfig } from './kube-craft'
import { kubeDoomConfig } from './kube-doom'
import { kubeGalagaConfig } from './kube-galaga'
import { kubeKartConfig } from './kube-kart'
import { kubeKongConfig } from './kube-kong'
import { kubeManConfig } from './kube-man'
import { kubePongConfig } from './kube-pong'
import { kubeSnakeConfig } from './kube-snake'
import { kubecostOverviewConfig } from './kubecost-overview'
import { kubectlConfig } from './kubectl'
import { kubedleConfig } from './kubedle'
import { kubescapeScanConfig } from './kubescape-scan'
import { kustomizationStatusConfig } from './kustomization-status'
import { kyvernoPoliciesConfig } from './kyverno-policies'
import { limitRangeStatusConfig } from './limit-range-status'
import { llmInferenceConfig } from './llm-inference'
import { llmModelsConfig } from './llm-models'
import { llmdStackMonitorConfig } from './llmd-stack-monitor'
import { matchGameConfig } from './match-game'
import { mlJobsConfig } from './ml-jobs'
import { mlNotebooksConfig } from './ml-notebooks'
import { mobileBrowserConfig } from './mobile-browser'
import { namespaceEventsConfig } from './namespace-events'
import { namespaceMonitorConfig } from './namespace-monitor'
import { namespaceOverviewConfig } from './namespace-overview'
import { namespaceQuotasConfig } from './namespace-quotas'
import { namespaceRbacConfig } from './namespace-rbac'
import { namespaceStatusConfig } from './namespace-status'
import { networkOverviewConfig } from './network-overview'
import { networkPolicyStatusConfig } from './network-policy-status'
import { networkUtilsConfig } from './network-utils'
import { nodeInvadersConfig } from './node-invaders'
import { nodeStatusConfig } from './node-status'
import { opaPoliciesConfig } from './opa-policies'
import { opencostOverviewConfig } from './opencost-overview'
import { operatorStatusConfig } from './operator-status'
import { operatorSubscriptionStatusConfig } from './operator-subscription-status'
import { overlayComparisonConfig } from './overlay-comparison'
import { podBrothersConfig } from './pod-brothers'
import { podCrosserConfig } from './pod-crosser'
import { podHealthTrendConfig } from './pod-health-trend'
import { podIssuesConfig } from './pod-issues'
import { podPitfallConfig } from './pod-pitfall'
import { podSweeperConfig } from './pod-sweeper'
import { policyViolationsConfig } from './policy-violations'
import { providerHealthConfig } from './provider-health'
import { prowCiMonitorConfig } from './prow-ci-monitor'
import { prowHistoryConfig } from './prow-history'
import { prowJobsConfig } from './prow-jobs'
import { prowStatusConfig } from './prow-status'
import { pvStatusConfig } from './pv-status'
import { pvcStatusConfig } from './pvc-status'
import { recentEventsConfig } from './recent-events'
import { replicaSetStatusConfig } from './replicaset-status'
import { resourceCapacityConfig } from './resource-capacity'
import { resourceMarshallConfig } from './resource-marshall'
import { resourceQuotaStatusConfig } from './resource-quota-status'
import { resourceTrendConfig } from './resource-trend'
import { resourceUsageConfig } from './resource-usage'
import { roleBindingStatusConfig } from './role-binding-status'
import { roleStatusConfig } from './role-status'
import { rssFeedConfig } from './rss-feed'
import { secretStatusConfig } from './secret-status'
import { securityIssuesConfig } from './security-issues'
import { serviceAccountStatusConfig } from './service-account-status'
import { serviceExportsConfig } from './service-exports'
import { serviceImportsConfig } from './service-imports'
import { serviceStatusConfig } from './service-status'
import { serviceTopologyConfig } from './service-topology'
import { solitaireConfig } from './solitaire'
import { statefulSetStatusConfig } from './statefulset-status'
import { stockMarketTickerConfig } from './stock-market-ticker'
import { storageOverviewConfig } from './storage-overview'
import { sudokuGameConfig } from './sudoku-game'
import { topPodsConfig } from './top-pods'
import { trivyScanConfig } from './trivy-scan'
import { upgradeStatusConfig } from './upgrade-status'
import { userManagementConfig } from './user-management'
import { vaultSecretsConfig } from './vault-secrets'
import { warningEventsConfig } from './warning-events'
import { weatherConfig } from './weather'
import { workloadDeploymentConfig } from './workload-deployment'
import { workloadMonitorConfig } from './workload-monitor'

export const CARD_CONFIGS: CardConfigRegistry = {
  active_alerts: activeAlertsConfig,
  alert_rules: alertRulesConfig,
  app_status: appStatusConfig,
  argocd_applications: argocdApplicationsConfig,
  argocd_health: argocdHealthConfig,
  argocd_sync_status: argocdSyncStatusConfig,
  cert_manager: certManagerConfig,
  chart_versions: chartVersionsConfig,
  checkers: checkersConfig,
  cluster_comparison: clusterComparisonConfig,
  cluster_costs: clusterCostsConfig,
  cluster_focus: clusterFocusConfig,
  cluster_groups: clusterGroupsConfig,
  cluster_health: clusterHealthConfig,
  cluster_health_monitor: clusterHealthMonitorConfig,
  cluster_locations: clusterLocationsConfig,
  cluster_metrics: clusterMetricsConfig,
  cluster_network: clusterNetworkConfig,
  cluster_resource_tree: clusterResourceTreeConfig,
  compliance_score: complianceScoreConfig,
  compute_overview: computeOverviewConfig,
  configmap_status: configMapStatusConfig,
  console_ai_health_check: consoleAiHealthCheckConfig,
  console_ai_issues: consoleAiIssuesConfig,
  console_ai_kubeconfig_audit: consoleAiKubeconfigAuditConfig,
  console_ai_offline_detection: consoleAiOfflineDetectionConfig,
  container_tetris: containerTetrisConfig,
  crd_health: crdHealthConfig,
  cronjob_status: cronJobStatusConfig,
  daemonset_status: daemonSetStatusConfig,
  deployment_issues: deploymentIssuesConfig,
  deployment_missions: deploymentMissionsConfig,
  deployment_progress: deploymentProgressConfig,
  deployment_status: deploymentStatusConfig,
  dynamic_card: dynamicCardConfig,
  event_stream: eventStreamConfig,
  event_summary: eventSummaryConfig,
  events_timeline: eventsTimelineConfig,
  external_secrets: externalSecretsConfig,
  falco_alerts: falcoAlertsConfig,
  flappy_pod: flappyPodConfig,
  game_2048: game2048Config,
  gateway_status: gatewayStatusConfig,
  github_activity: githubActivityConfig,
  github_ci_monitor: githubCiMonitorConfig,
  gitops_drift: gitopsDriftConfig,
  gpu_inventory: gpuInventoryConfig,
  gpu_overview: gpuOverviewConfig,
  gpu_status: gpuStatusConfig,
  gpu_usage_trend: gpuUsageTrendConfig,
  gpu_utilization: gpuUtilizationConfig,
  gpu_workloads: gpuWorkloadsConfig,
  hardware_health: hardwareHealthConfig,
  helm_history: helmHistoryConfig,
  helm_release_status: helmReleaseStatusConfig,
  helm_values_diff: helmValuesDiffConfig,
  hpa_status: hpaStatusConfig,
  iframe_embed: iframeEmbedConfig,
  ingress_status: ingressStatusConfig,
  job_status: jobStatusConfig,
  kube_chess: kubeChessConfig,
  kube_craft: kubeCraftConfig,
  kube_doom: kubeDoomConfig,
  kube_galaga: kubeGalagaConfig,
  kube_kart: kubeKartConfig,
  kube_kong: kubeKongConfig,
  kube_man: kubeManConfig,
  kube_pong: kubePongConfig,
  kube_snake: kubeSnakeConfig,
  kubecost_overview: kubecostOverviewConfig,
  kubectl: kubectlConfig,
  kubedle: kubedleConfig,
  kubescape_scan: kubescapeScanConfig,
  kustomization_status: kustomizationStatusConfig,
  kyverno_policies: kyvernoPoliciesConfig,
  limit_range_status: limitRangeStatusConfig,
  llm_inference: llmInferenceConfig,
  llm_models: llmModelsConfig,
  llmd_stack_monitor: llmdStackMonitorConfig,
  match_game: matchGameConfig,
  ml_jobs: mlJobsConfig,
  ml_notebooks: mlNotebooksConfig,
  mobile_browser: mobileBrowserConfig,
  namespace_events: namespaceEventsConfig,
  namespace_monitor: namespaceMonitorConfig,
  namespace_overview: namespaceOverviewConfig,
  namespace_quotas: namespaceQuotasConfig,
  namespace_rbac: namespaceRbacConfig,
  namespace_status: namespaceStatusConfig,
  network_overview: networkOverviewConfig,
  network_policy_status: networkPolicyStatusConfig,
  network_utils: networkUtilsConfig,
  node_invaders: nodeInvadersConfig,
  node_status: nodeStatusConfig,
  opa_policies: opaPoliciesConfig,
  opencost_overview: opencostOverviewConfig,
  operator_status: operatorStatusConfig,
  operator_subscription_status: operatorSubscriptionStatusConfig,
  overlay_comparison: overlayComparisonConfig,
  pod_brothers: podBrothersConfig,
  pod_crosser: podCrosserConfig,
  pod_health_trend: podHealthTrendConfig,
  pod_issues: podIssuesConfig,
  pod_pitfall: podPitfallConfig,
  pod_sweeper: podSweeperConfig,
  policy_violations: policyViolationsConfig,
  provider_health: providerHealthConfig,
  prow_ci_monitor: prowCiMonitorConfig,
  prow_history: prowHistoryConfig,
  prow_jobs: prowJobsConfig,
  prow_status: prowStatusConfig,
  pv_status: pvStatusConfig,
  pvc_status: pvcStatusConfig,
  recent_events: recentEventsConfig,
  replicaset_status: replicaSetStatusConfig,
  resource_capacity: resourceCapacityConfig,
  resource_marshall: resourceMarshallConfig,
  resource_quota_status: resourceQuotaStatusConfig,
  resource_trend: resourceTrendConfig,
  resource_usage: resourceUsageConfig,
  role_binding_status: roleBindingStatusConfig,
  role_status: roleStatusConfig,
  rss_feed: rssFeedConfig,
  secret_status: secretStatusConfig,
  security_issues: securityIssuesConfig,
  service_account_status: serviceAccountStatusConfig,
  service_exports: serviceExportsConfig,
  service_imports: serviceImportsConfig,
  service_status: serviceStatusConfig,
  service_topology: serviceTopologyConfig,
  solitaire: solitaireConfig,
  statefulset_status: statefulSetStatusConfig,
  stock_market_ticker: stockMarketTickerConfig,
  storage_overview: storageOverviewConfig,
  sudoku_game: sudokuGameConfig,
  top_pods: topPodsConfig,
  trivy_scan: trivyScanConfig,
  upgrade_status: upgradeStatusConfig,
  user_management: userManagementConfig,
  vault_secrets: vaultSecretsConfig,
  warning_events: warningEventsConfig,
  weather: weatherConfig,
  workload_deployment: workloadDeploymentConfig,
  workload_monitor: workloadMonitorConfig,
}

export function getCardConfig(cardType: string): UnifiedCardConfig | undefined {
  return CARD_CONFIGS[cardType]
}

export function hasUnifiedConfig(cardType: string): boolean {
  return cardType in CARD_CONFIGS
}

export function getUnifiedCardTypes(): string[] {
  return Object.keys(CARD_CONFIGS)
}

// Re-export configs
export {
  activeAlertsConfig,
  alertRulesConfig,
  appStatusConfig,
  argocdApplicationsConfig,
  argocdHealthConfig,
  argocdSyncStatusConfig,
  certManagerConfig,
  chartVersionsConfig,
  checkersConfig,
  clusterComparisonConfig,
  clusterCostsConfig,
  clusterFocusConfig,
  clusterGroupsConfig,
  clusterHealthConfig,
  clusterHealthMonitorConfig,
  clusterLocationsConfig,
  clusterMetricsConfig,
  clusterNetworkConfig,
  clusterResourceTreeConfig,
  complianceScoreConfig,
  computeOverviewConfig,
  configMapStatusConfig,
  consoleAiHealthCheckConfig,
  consoleAiIssuesConfig,
  consoleAiKubeconfigAuditConfig,
  consoleAiOfflineDetectionConfig,
  containerTetrisConfig,
  crdHealthConfig,
  cronJobStatusConfig,
  daemonSetStatusConfig,
  deploymentIssuesConfig,
  deploymentMissionsConfig,
  deploymentProgressConfig,
  deploymentStatusConfig,
  dynamicCardConfig,
  eventStreamConfig,
  eventSummaryConfig,
  eventsTimelineConfig,
  externalSecretsConfig,
  falcoAlertsConfig,
  flappyPodConfig,
  game2048Config,
  gatewayStatusConfig,
  githubActivityConfig,
  githubCiMonitorConfig,
  gitopsDriftConfig,
  gpuInventoryConfig,
  gpuOverviewConfig,
  gpuStatusConfig,
  gpuUsageTrendConfig,
  gpuUtilizationConfig,
  gpuWorkloadsConfig,
  helmHistoryConfig,
  helmReleaseStatusConfig,
  helmValuesDiffConfig,
  hpaStatusConfig,
  iframeEmbedConfig,
  ingressStatusConfig,
  jobStatusConfig,
  kubeChessConfig,
  kubeCraftConfig,
  kubeDoomConfig,
  kubeGalagaConfig,
  kubeKartConfig,
  kubeKongConfig,
  kubeManConfig,
  kubePongConfig,
  kubeSnakeConfig,
  kubecostOverviewConfig,
  kubectlConfig,
  kubedleConfig,
  kubescapeScanConfig,
  kustomizationStatusConfig,
  kyvernoPoliciesConfig,
  limitRangeStatusConfig,
  llmInferenceConfig,
  llmModelsConfig,
  llmdStackMonitorConfig,
  matchGameConfig,
  mlJobsConfig,
  mlNotebooksConfig,
  mobileBrowserConfig,
  namespaceEventsConfig,
  namespaceMonitorConfig,
  namespaceOverviewConfig,
  namespaceQuotasConfig,
  namespaceRbacConfig,
  namespaceStatusConfig,
  networkOverviewConfig,
  networkPolicyStatusConfig,
  networkUtilsConfig,
  nodeInvadersConfig,
  nodeStatusConfig,
  opaPoliciesConfig,
  opencostOverviewConfig,
  operatorStatusConfig,
  operatorSubscriptionStatusConfig,
  overlayComparisonConfig,
  podBrothersConfig,
  podCrosserConfig,
  podHealthTrendConfig,
  podIssuesConfig,
  podPitfallConfig,
  podSweeperConfig,
  policyViolationsConfig,
  providerHealthConfig,
  prowCiMonitorConfig,
  prowHistoryConfig,
  prowJobsConfig,
  prowStatusConfig,
  pvStatusConfig,
  pvcStatusConfig,
  recentEventsConfig,
  replicaSetStatusConfig,
  resourceCapacityConfig,
  resourceMarshallConfig,
  resourceQuotaStatusConfig,
  resourceTrendConfig,
  resourceUsageConfig,
  roleBindingStatusConfig,
  roleStatusConfig,
  rssFeedConfig,
  secretStatusConfig,
  securityIssuesConfig,
  serviceAccountStatusConfig,
  serviceExportsConfig,
  serviceImportsConfig,
  serviceStatusConfig,
  serviceTopologyConfig,
  solitaireConfig,
  statefulSetStatusConfig,
  stockMarketTickerConfig,
  storageOverviewConfig,
  sudokuGameConfig,
  topPodsConfig,
  trivyScanConfig,
  upgradeStatusConfig,
  userManagementConfig,
  vaultSecretsConfig,
  warningEventsConfig,
  weatherConfig,
  workloadDeploymentConfig,
  workloadMonitorConfig,
}
