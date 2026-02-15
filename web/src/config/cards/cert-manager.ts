/**
 * Cert Manager Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const certManagerConfig: UnifiedCardConfig = {
  type: 'cert_manager',
  title: 'Certificates',
  category: 'security',
  description: 'cert-manager certificate status',
  icon: 'FileKey',
  iconColor: 'text-green-400',
  defaultWidth: 4,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useCertManager' },
  content: {
    type: 'stats-grid',
    stats: [
      { field: 'total', label: 'Total', color: 'blue' },
      { field: 'ready', label: 'Ready', color: 'green' },
      { field: 'expiringSoon', label: 'Expiring', color: 'yellow' },
    ],
  },
  emptyState: { icon: 'FileKey', title: 'No Certs', message: 'No certificates found', variant: 'info' },
  loadingState: { type: 'stats', count: 3 },
  isDemoData: false,
  isLive: true,
}
export default certManagerConfig
