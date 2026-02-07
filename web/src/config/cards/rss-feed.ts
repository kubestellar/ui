/**
 * RSS Feed Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const rssFeedConfig: UnifiedCardConfig = {
  type: 'rss_feed',
  title: 'RSS Feed',
  category: 'utility',
  description: 'RSS/Atom feed reader',
  icon: 'Rss',
  iconColor: 'text-orange-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useRSSFeed' },
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'title', header: 'Title', primary: true, render: 'truncate' },
      { field: 'source', header: 'Source', render: 'text', width: 100 },
      { field: 'pubDate', header: 'Published', render: 'relative-time', width: 100 },
    ],
  },
  emptyState: { icon: 'Rss', title: 'No Feed', message: 'No RSS feed configured', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: false,
  isLive: true,
}
export default rssFeedConfig
