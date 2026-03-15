/**
 * Security Issues Card Configuration
 *
 * Displays security vulnerabilities and issues across clusters.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const securityIssuesConfig: UnifiedCardConfig = {
  type: 'security_issues',
  title: 'Security Issues',
  category: 'security',
  description: 'Security vulnerabilities and issues detected across clusters',
  icon: 'Shield',
  iconColor: 'text-red-400',
  defaultWidth: 6,
  defaultHeight: 3,

  isDemoData: true, // Uses demo data hook in registerHooks.ts

  dataSource: {
    type: 'hook',
    hook: 'useSecurityIssues',
  },

  content: {
    type: 'list',
    columns: [
      {
        field: 'severity',
        header: 'Severity',
        width: 80,
        render: 'status-badge',
      },
      {
        field: 'type',
        header: 'Type',
        width: 120,
      },
      {
        field: 'resource',
        header: 'Resource',
        primary: true,
      },
      {
        field: 'cluster',
        header: 'Cluster',
        width: 100,
        render: 'cluster-badge',
      },
    ],
    pageSize: 8,
  },

  filters: [
    {
      field: 'severity',
      label: 'Severity',
      type: 'select',
      options: [
        { value: 'all', label: 'All' },
        { value: 'critical', label: 'Critical' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
      ],
    },
  ],

  emptyState: {
    icon: 'ShieldCheck',
    title: 'No security issues',
    message: 'All resources are secure',
    variant: 'success',
  },

  drillDown: {
    action: 'showSecurityIssue',
    params: ['resource', 'type', 'severity'],
  },
}
