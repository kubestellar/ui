/**
 * Stock Market Ticker Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const stockMarketTickerConfig: UnifiedCardConfig = {
  type: 'stock_market_ticker',
  title: 'Stock Ticker',
  category: 'utility',
  description: 'Live stock market data',
  icon: 'TrendingUp',
  iconColor: 'text-green-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useStockMarketTicker' },
  content: {
    type: 'custom',
    component: 'StockTicker',
  },
  emptyState: { icon: 'TrendingUp', title: 'No Data', message: 'Stock data unavailable', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: true,
}
export default stockMarketTickerConfig
