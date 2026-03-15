/**
 * Cluster Locations Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const clusterLocationsConfig: UnifiedCardConfig = {
  type: 'cluster_locations',
  title: 'Cluster Locations',
  category: 'cluster-health',
  description: 'Geographic distribution of clusters',
  icon: 'MapPin',
  iconColor: 'text-red-400',
  defaultWidth: 8,
  defaultHeight: 4,
  dataSource: { type: 'hook', hook: 'useClusterLocations' },
  content: {
    type: 'custom',
    component: 'ClusterMap',
  },
  emptyState: { icon: 'MapPin', title: 'No Location Data', message: 'Cluster location data not available', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: true,
  isLive: false,
}
export default clusterLocationsConfig
