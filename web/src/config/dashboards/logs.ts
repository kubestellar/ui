/**
 * Logs Dashboard Configuration
 */
import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const logsDashboardConfig: UnifiedDashboardConfig = {
  id: 'logs',
  name: 'Logs',
  subtitle: 'Event streams and cluster logs',
  route: '/logs',
  statsType: 'logs',
  cards: [
    { id: 'event-stream-1', cardType: 'event_stream', title: 'Event Stream', position: { w: 12, h: 4 } },
    { id: 'namespace-events-1', cardType: 'namespace_events', title: 'Namespace Events', position: { w: 6, h: 3 } },
    { id: 'events-timeline-1', cardType: 'events_timeline', title: 'Events Timeline', position: { w: 6, h: 3 } },
  ],
  features: {
    dragDrop: true,
    addCard: true,
    autoRefresh: true,
    autoRefreshInterval: 30000,
  },
  storageKey: 'kubestellar-logs-cards',
}

export default logsDashboardConfig
