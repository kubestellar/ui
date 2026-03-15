/**
 * Security Dashboard Configuration
 *
 * Dashboard focused on security posture and compliance.
 */

import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const securityDashboardConfig: UnifiedDashboardConfig = {
  id: 'security',
  name: 'Security',
  subtitle: 'Security posture overview',
  route: '/security',

  statsType: 'security',
  stats: {
    type: 'security',
    title: 'Security Status',
    collapsible: true,
    showConfigButton: true,
    blocks: [
      {
        id: 'critical',
        name: 'Critical',
        icon: 'AlertTriangle',
        color: 'red',
        visible: true,
        valueSource: { type: 'field', path: 'summary.criticalIssues' },
      },
      {
        id: 'high',
        name: 'High',
        icon: 'AlertCircle',
        color: 'orange',
        visible: true,
        valueSource: { type: 'field', path: 'summary.highIssues' },
      },
      {
        id: 'medium',
        name: 'Medium',
        icon: 'Info',
        color: 'yellow',
        visible: true,
        valueSource: { type: 'field', path: 'summary.mediumIssues' },
      },
      {
        id: 'policies',
        name: 'Policies',
        icon: 'Shield',
        color: 'blue',
        visible: true,
        valueSource: { type: 'field', path: 'summary.totalPolicies' },
      },
      {
        id: 'compliant',
        name: 'Compliant',
        icon: 'CheckCircle2',
        color: 'green',
        visible: true,
        valueSource: { type: 'field', path: 'summary.compliancePercent' },
        format: 'percentage',
      },
    ],
  },

  cards: [
    {
      id: 'security-1',
      cardType: 'security_issues',
      position: { w: 6, h: 3, x: 0, y: 0 },
    },
    {
      id: 'security-2',
      cardType: 'active_alerts',
      position: { w: 6, h: 3, x: 6, y: 0 },
    },
  ],

  availableCardTypes: [
    'security_issues',
    'active_alerts',
    'pod_issues',
  ],

  features: {
    dragDrop: true,
    autoRefresh: true,
    autoRefreshInterval: 60000,
    addCard: true,
  },

  storageKey: 'kubestellar-unified-security-dashboard',
}

export default securityDashboardConfig
