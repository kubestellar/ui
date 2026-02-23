/**
 * Data Compliance Dashboard Configuration
 */
import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const dataComplianceDashboardConfig: UnifiedDashboardConfig = {
  id: 'data-compliance',
  name: 'Data Compliance',
  subtitle: 'Data protection and compliance posture',
  route: '/data-compliance',
  statsType: 'data-compliance',
  cards: [
    { id: 'vault-secrets-1', cardType: 'vault_secrets', title: 'HashiCorp Vault', position: { w: 4, h: 3 } },
    { id: 'external-secrets-1', cardType: 'external_secrets', title: 'External Secrets', position: { w: 4, h: 3 } },
    { id: 'cert-manager-1', cardType: 'cert_manager', title: 'Cert-Manager', position: { w: 4, h: 3 } },
    { id: 'namespace-rbac-1', cardType: 'namespace_rbac', title: 'Access Controls', position: { w: 6, h: 4 } },
  ],
  features: {
    dragDrop: true,
    addCard: true,
    autoRefresh: true,
    autoRefreshInterval: 30000,
  },
  storageKey: 'data-compliance-dashboard-cards',
}

export default dataComplianceDashboardConfig
