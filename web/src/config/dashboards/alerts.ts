/**
 * Alerts Dashboard Configuration
 */
import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const alertsDashboardConfig: UnifiedDashboardConfig = {
  id: 'alerts',
  name: 'Alerts',
  subtitle: 'Alert management and configuration',
  route: '/alerts',
  statsType: 'alerts',
  cards: [
    { id: 'active-alerts-1', cardType: 'active_alerts', position: { w: 8, h: 4 } },
    { id: 'alert-rules-1', cardType: 'alert_rules', position: { w: 4, h: 3 } },
    { id: 'falco-alerts-1', cardType: 'falco_alerts', position: { w: 6, h: 3 } },
    { id: 'warning-events-1', cardType: 'warning_events', position: { w: 6, h: 3 } },
    { id: 'event-summary-1', cardType: 'event_summary', position: { w: 6, h: 3 } },
  ],
  features: {
    dragDrop: true,
    addCard: true,
    autoRefresh: true,
    autoRefreshInterval: 15000,
  },
  storageKey: 'alerts-dashboard-cards',
}

export default alertsDashboardConfig
