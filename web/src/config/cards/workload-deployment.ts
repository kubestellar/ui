/**
 * Workload Deployment Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const workloadDeploymentConfig: UnifiedCardConfig = {
  type: 'workload_deployment',
  title: 'Workload Deployment',
  category: 'workloads',
  description: 'Deploy workloads to clusters',
  icon: 'Upload',
  iconColor: 'text-blue-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useWorkloadDeployment' },
  content: { type: 'custom', component: 'WorkloadDeploymentUI' },
  emptyState: { icon: 'Upload', title: 'Deploy', message: 'Select workload to deploy', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: true,
}
export default workloadDeploymentConfig
