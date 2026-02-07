/**
 * Weather Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const weatherConfig: UnifiedCardConfig = {
  type: 'weather',
  title: 'Weather',
  category: 'utility',
  description: 'Current weather conditions',
  icon: 'Cloud',
  iconColor: 'text-sky-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useWeather' },
  content: {
    type: 'custom',
    component: 'WeatherDisplay',
  },
  emptyState: { icon: 'Cloud', title: 'No Weather', message: 'Weather data unavailable', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: true,
}
export default weatherConfig
